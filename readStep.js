/**
 *  readSTEP :
 *  a tool to  read and interpret a STEP ( AP203 - ISO 10303-21 ) file
 *
 *  Author : Etienne Rossignon ( etienne.rossignon@gadz.org )
 */

require('colors');
var util = require("util");
var assert = require('assert');
var Table = require('easy-table');

// http://www.steptools.com/support/stdev_docs/express/ap203/html/index.html
var waiting_file_type = 1;
var waiting_section = 2; // HEADER; or DATA;
var in_header_section = 3;
var in_data_section = 4;
var parsing_complete = 5;

var pattern_ISO_10303_21 = /ISO-10303-21;/;
var pattern_HEADER = /HEADER;/;
var pattern_DATA = /DATA;/;
var pattern_ENDSEC = /ENDSEC;/;

var verbose = false;
/**
 *
 * @param callback
 * @constructor
 */
var StepIndexer = function (callback) {

    "use strict";

    this.lastLine = "";
    this.entries = { };
    this.types = {};
    this.typesRev = {};
    this.callback = callback;

    // pattern for simple step line #123=TOTO(....)
    this.patternSimple = /^(\w+)\s*(\(.*\))\s*;/;

    this.startLinePattern = /\#([0-9]+)\s*=\s*(.*)/;  // something like # 123 = ...

    this.curLine = "";

    this.bad_STEP_file = false;

    this.status = waiting_file_type;

    this.header = []; // un parsed header

};

util.inherits(StepIndexer, require("stream"));

StepIndexer.prototype._getTypeIndex = function (strType) {
    "use strict";
    var me = this;
    var typeIndex;
    if (me.types.hasOwnProperty(strType)) {
        typeIndex = me.types[strType];
    } else {
        //typeIndex = { key: me.typeCounter++ , array: []};
        typeIndex = { key: strType, array: []};
        me.types[strType] = typeIndex;
        me.typesRev[typeIndex.key] = strType;
    }
    return typeIndex;
};

function trim(str) {
    "use strict";
    return str.replace(/^\s+/g, '').replace(/\s+$/g, '');
}


/**
 * _splitComplexLine processes a complex step line.
 * of the form
 *     IDENTIFIER(x,y,(x,y,e),y)IDENTIFIER2(1,2,#1232)....
 *
 * @param line
 * @returns {Array}
 * @private
 */
StepIndexer.prototype._splitComplexLine = function (line) {

    "use strict";

    var me = this;
    var array = [];
    var i = 1;
    var n = line.length - 2;
    var s;
    while (i < n) {
        s = i;

        // skip identifier
        while (line[i] !== '(' && i < n) {
            i++;
            if (i >= n) { break;}
        }

        var identifier = trim(line.substr(s, i - s));

        // find balanced closing )
        var parLevel = 1;
        s = i;
        i+=1;

        while ((line[i] !== ')') || parLevel !== 1) {
            if (line[i] === ')')  { parLevel--;}
            if (line[i] === '(')  { parLevel++;}
            i++;
            if (i >= n) { break; }
        }

        var content = line.substr(s, i - s + 1);
        i++;
        if (identifier !== '') {
            var typeIndex = me._getTypeIndex(identifier);
            array.push({ type: typeIndex.key, args: content});
        }
    }
    return array;
};


StepIndexer.prototype.write = function (data) {

    "use strict";

    var me = this;

    if (me.bad_STEP_file) {
        console.log("bad step");
        return;
    }

    var lines = (this.lastLine + data.toString()).split(/\r\n|\n/);

    this.lastLine = lines.splice(lines.length - 1)[0];

    var matches,line_m,num,typeIndex,entry,type;

    lines.forEach(function (line /*, index, array*/) {

        if (me.bad_STEP_file) {
            return;
        }

        if (me.status === waiting_file_type) {
            if (pattern_ISO_10303_21.test(line)) {
                me.status = waiting_section;
                return;
            } else {
                me.bad_STEP_file = true;
                // destroy the input stream
                me.input.destroy();
                return;
            }

        }

        if (me.status === waiting_section) {
            if (pattern_HEADER.test(line)) {
                me.status = in_header_section;
                return;
            } else if (pattern_DATA.test(line)) {
                me.status = in_data_section;
                return;
            }
        }

        if (me.status === in_header_section) {

            if (pattern_ENDSEC.test(line)) {
                me.status = waiting_section;
                return;
            }
            me.header.push(line);

        } else if (me.status === in_data_section) {

            if (pattern_ENDSEC.test(line)) {
                me.status = parsing_complete;
                return;
            }

            matches = me.startLinePattern.exec(line);
            if (matches) {
                me.curNum = matches[1];
                me.curLine = matches[2];
            } else {
                me.curLine += line;
            }
            if (me.curLine[me.curLine.length - 1] === ';') {

                matches = me.patternSimple.exec(me.curLine);

                if (matches) {
                    // we have identify a simple form step line
                    // example:
                    //     #1234=EDGE_LOOP('',(#234));
                    //
                    num       = me.curNum;
                    type      = matches[1];
                    line_m    = matches[2];

                    // keep track of this
                    typeIndex = me._getTypeIndex(type);
                    typeIndex.array.push(num);
                    assert(typeIndex.key === type);

                    entry     = {
                        _id: num,
                        type: typeIndex.key,
                        line: line_m
                    };
                    me.entries[num] = entry;


                } else {
                    // this is probably a complex form step line
                    // example:
                    // #1307=(NAMED_UNIT(*)SI_UNIT($,.STERADIAN.)SOLID_ANGLE_UNIT());
                    //
                    num       = me.curNum;
                    entry     = {
                        _id: num,
                        types: me._splitComplexLine(me.curLine)
                    };

                    me.entries[num] = entry;

                    entry.types.forEach(function (element) {
                        var type = element.type;
                        var typeIndex = me._getTypeIndex(type);
                        typeIndex.array.push(num);
                    });
                }
            }
        }
    });
};

function buildRegExp(t) {

    "use strict";

    var s = ".*\\(\\s*";
    // BOOLEAN
    t = t.replace(/B/g, "\\s*(\\.T\\.|\\.F\\.|\\.U\\.|\\*|\\$)\\s*");
    // IDENTIFIER
    t = t.replace(/I/g, "('[^']*'|\\*|\\$)");
    // LABEL
    t = t.replace(/L/g, "('[^']*'|\\*|\\$)");
    // STRING
    t = t.replace(/S/g, "('[^']*'|\\*|\\$)");
    // Set of #
    t = t.replace(/\[#\]/g, "%");
    // ENTITY (#123)
    t = t.replace(/#/g, "#([0-9]+)");
    t = t.replace(/E/g, "#([0-9]+)");
    // ,
    t = t.replace(/,/g, "\\s*,\\s*");
    // SET of #
    t = t.replace(/%/g, "\\(\\s*([0-9\\s\\#\\,]+)\\s*\\)");
    // enum
    t = t.replace(/@/g, "\\s*\\.([A-Za-z_]+)\\.\\s*");
    s += t;
    s += ".*\\s*\\)";
    return new RegExp(s);
}

var parsers = {};

function buildSimplePattern(props) {
    "use strict";
    var s = "";
    props.forEach(function (p) {
        s += "," + p.type;
    });
    // remove first ','
    return s.slice(1);
}


function constructParsingEngine(done) {

    "use strict";
    assert(done);

    var SCHEMA = require("./readExpressSchema");

    SCHEMA.readSchema("./specs/wg3n916_ap203.exp", function (err, grammar) {
        if (!err) {
            console.log(" entities", grammar.entities);

            var keys_ = Object.keys(grammar.entities);

            var keys = [
                "PRODUCT_DEFINITION_FORMATION",
                "PRODUCT_DEFINITION_FORMATION_WITH_SPECIFIED_SOURCE",
                "PRODUCT_DEFINITION_CONTEXT",
                "PRODUCT_DEFINITION",
                "DESIGN_CONTEXT",
                "PRODUCT",
                "PRODUCT_CONTEXT",
                "MECHANICAL_CONTEXT",
                "APPLICATION_CONTEXT",
                "SHAPE_DEFINITION_REPRESENTATION",
                "REPRESENTATION_RELATIONSHIP",
                "REPRESENTATION_RELATIONSHIP_WITH_TRANSFORMATION",
                "SHAPE_REPRESENTATION_RELATIONSHIP",
                "PROPERTY_DEFINITION",
                "SHAPE_DEFINITION_REPRESENTATION",
                "PRODUCT_DEFINITION_SHAPE",
                "PRODUCT_DEFINITION_USAGE",
                "ASSEMBLY_COMPONENT_USAGE",
                "NEXT_ASSEMBLY_USAGE_OCCURRENCE",
                "MAPPED_ITEM",
                "REPRESENTATION_MAP",
                "AXIS2_PLACEMENT_3D",
                "REPRESENTATION_ITEM",
                "REPRESENTATION_CONTEXT",
                "REPRESENTATION",
                "SHAPE_REPRESENTATION",
                "ADVANCED_BREP_SHAPE_REPRESENTATION",
                "FACETED_BREP_SHAPE_REPRESENTATION",
                "GEOMETRIC_REPRESENTATION_ITEM",
                "GEOMETRIC_REPRESENTATION_CONTEXT",
                "GLOBAL_UNIT_ASSIGNED_CONTEXT",
                "GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT",
                "SOLID_MODEL",
                "MANIFOLD_SOLID_BREP",
                "BREP_WITH_VOIDS",
                "FACETED_BREP",
                "TOPOLOGICAL_REPRESENTATION_ITEM",
                "FACE",
                "ADVANCED_FACE",
                "FACE_BOUND",
                "FACE_OUTER_BOUND",
                "LOOP",
                "EDGE_LOOP",
                "SURFACE",
                "SHAPE_ASPECT",
                "PRODUCT_DEFINITION_WITH_ASSOCIATED_DOCUMENTS",
                "GEOMETRICALLY_BOUNDED_SURFACE_SHAPE_REPRESENTATION",
                "TRIMMED_CURVE",
                "DEFINITIONAL_REPRESENTATION",
                "PARAMETRIC_REPRESENTATION_CONTEXT"
            ];


            keys.forEach(function (entityName) {

                entityName = entityName.toUpperCase();
                var props = grammar.buildProp(entityName);

                var simplePattern = buildSimplePattern(props);

                console.log(" pattern for ", entityName, " = ", simplePattern);

                for (var p in props) {
                    if (props.hasOwnProperty(p) ) {
                        console.log("    prop", props[p].type, props[p].name, props[p].class);
                    }
                }

                var pattern = buildRegExp(simplePattern);
                // console.log(" name = ",name, simplePattern);
                parsers[entityName] = {
                    type: "ENTITY",
                    pattern: pattern,
                    props: props,
                    name: entityName
                };
            });

            var keys_select = Object.keys(grammar._selects);
            keys_select.forEach(function (selectName) {
                selectName = selectName.toUpperCase();
                var list_select = grammar.buildSelectList(selectName);
                parsers[selectName] = {
                    type: "SELECT",
                    select: list_select
                };

            });

            done();
        } else {
            done(err);
        }
    });
}

var init_done = false;
function performInitialisation(done) {

    "use strict";

    if (init_done) {
        done();
    } else {
        constructParsingEngine(function () {
            init_done = true;
            // process.exit();
            done();
        });
    }
}

StepIndexer.prototype.parse = function (entity, parser) {

    "use strict";

    var me = this;

    var obj = {};
    obj._id = entity._id;

    if (entity.object) {
        return entity.object;
    }

    if (!parser) {

        if (entity.type) {

            //  this is a simple type
            var type = me.typesRev[entity.type];
            parser = parsers[type];
            if (!parser) {
                console.log(" Error !!! cannot get parser for ".red, entity.type, " in ".red, type, entity);
            }

            me._parseType(obj, entity.line, parser);
            // console.log("type ", type,parser);


        } else {
            // this is a complex type

            assert(entity.types instanceof Array);

            // let parse each segment
            entity.types.forEach(function (el) {

                var type = me.typesRev[el.type];

                parser = parsers[type];

                if (!parser) {
                    console.log(" Error !!! cannot get parser for ".yellow, type, " in ".yellow, entity);
                } else {
                    me._parseType(obj, el.args, parser);
                }
            });
        }
    } else {
        me._parseType(obj, entity.line, parser);
    }

    // mark the entity as being parsed by caching the resulting object and clearing the original line
    // which is no more required.
    entity.object = obj;
    entity.line = null;

    return obj;
};

StepIndexer.prototype._parseType = function (obj, entity_line, parser) {

    "use strict";
    if (!parser) {
        console.log(" missing parser".red.bold);
        return {};
    }
    if (verbose) {
        console.log(parser.name," #", obj._id, "  parsing ".cyan,parser.pattern, ' on line ', entity_line);
    }
    var me = this;
    var matches = parser.pattern.exec(entity_line);

    if (!matches) {
        console.log("#", obj._id, parser.name, " cannot parse ".red, parser.pattern, ' on line ', entity_line);
        return {};
    }
    if (matches.length - 1 !== parser.props.length) {
        console.log(" warning : not enough element found in ".green);
        console.log(" parsing ", ((parser.pattern) + "").red);
        console.log(" on line ", entity_line.cyan);
        console.log(matches);
    }

    if (obj._class) {
        if ( ! obj instanceof Array) {
            var tmp = obj._class;
            obj._class = [ tmp ];
        }
        obj._class.push(parser.name);
    } else {
        obj._class = parser.name;
    }


    function resolove_entity_id(entity_id) {
        var entity = me.entries[entity_id];
        if (entity === null) {
            return entity_id;
        }
        return me.parse(entity,null);
    }

    for (var i = 0; i < matches.length - 1; i++) {

        var property = parser.props[i];

        var value = matches[i + 1];

        if (property.type === '[#]') {

            // parse the array of ids

            var array_of_ids = [];
            var r = /#([0-9]+),{0,1}/g;

            var m;
            while ( (m = r.exec(value)) !== null ) {
                array_of_ids.push(m[1]);
            }
            value = array_of_ids;
        }

        // add a property to the object with the specified value
        obj[property.name] = value;

        // if the property is a pointer to an other entity
        // or a array of pointer, let recursively
        // resolve ids to objects
        if (property.class ) {

            if (parsers[property.class]) {
                // a parser exists,
                if (value instanceof Array) {
                    obj[property.name] = value.map(resolove_entity_id) ;
                } else {
                    obj[property.name] = resolove_entity_id(value);
                }
            } else {
                if ( ! property.class in ["LABEL","TEXT","IDENTIFIER"])  {
                    console.log(" No parser to resolve property ".yellow,property.name ,
                        "#",value, " into ".yellow, property.class);

                }
            }
        }
    }
    return obj;
};


StepIndexer.prototype.end = function (data) {

    "use strict";

    assert(data === undefined);
    // console.log(" END with ", data);
    var me = this;
    if (me.status !== parsing_complete) {
        me.bad_STEP_file = true;
        me.callback(new Error("Invalid step file"));
    } else {
        me.callback();
    }
};

var fs = require("fs");

/**
 * return true if the file is a correct STEP file
 * a correct STEP file starts with
 *     ISO-10303-21;
 *     HEADER;
 *
 * @param filename
 * @param callback
 */
function check_STEP_file(filename, callback) {

    "use strict";

    // "ISO-10303-21;"
    // "HEADER;"
    var stream = fs.createReadStream(filename, "r");

    var fileData = "";
    stream.on('data', function (data) {
        fileData += data;

        // The next lines should be improved
        var lines = fileData.split("\n");

        if (lines.length >= 2) {

            stream.destroy();
            if (!pattern_ISO_10303_21.test(lines[0])) {
                my_callback(new Error("this file is not a STEP FILE : ISO_10303_21 missing"));
            } else {
                my_callback(null, lines[0]);
            }
        }
    });
    stream.on('error', function () {
        my_callback('Error', null);
    });

    stream.on('end', function () {
        my_callback('File end reached without finding line', null);
    });

    var callback_called = false;

    function my_callback(err, data) {
        if (!callback_called) {
            callback_called = true;
            callback(err, data);
        }
    }
}
function StepReader() {
    "use strict";
}

StepReader.prototype.getObjects = function (className) {

    "use strict";

    var me = this.indexer;
    if (!me.types.hasOwnProperty(className)) {
        return [];
    }
    return me.types[className].array.map(function (num) {
        //console.log(num);
        return me.parse(me.entries[num]);
    });
};

StepReader.prototype.getEntity = function (id) {

    "use strict";

    var me = this.indexer;
    return me.entries["" + id];
};

StepReader.prototype.dumpStatistics = function () {

    "use strict";

    var table = new Table({
        head: ['TH 1 label', 'TH 2 label'], colWidths: [100, 200]
    });


    var me = this.indexer;
    if (me.bad_STEP_file) {
        console.log(" file " + this.filename + " is not a valid STEP file");
        return;
    }
    Object.keys(me.types).sort().forEach(function (k) {
        table.cell('Type', k);
        table.cell('Count', me.types[k].array.length);
        table.newRow();
        // console.log(" type", k, );
    });
    table.sort(['Count', 'Type']);
    console.log(table.toString());


    this.dumpAssemblies();
};

StepReader.prototype.read = function (filename, callback) {

    "use strict";

    var me = this;

    performInitialisation(function () {
        me.filename = filename;
        me.input = fs.createReadStream(filename);
        me.indexer = new StepIndexer(function (err) {

            if (err) {
                callback(err);
                return;
            }
            callback(null, me);
        });
        me.indexer.input = me.input;
        me.input.pipe(me.indexer);

    });
    return this.indexer;

};


/**
 * find all nauo (Next Assembly Usage Occurence's) related to a given product definition
 *
 * @param product_definition_id
 * @returns {Array}  of product_definition
 */
StepReader.prototype.find_nauo_relating_to = function (product_definition_id) {

    "use strict";

    var reader = this;

    var nauos = reader.getObjects("NEXT_ASSEMBLY_USAGE_OCCURRENCE");
    // assert(nauos.length > 0 );
    var result = [];
    nauos.forEach(function (nauo) {
        if (nauo.relating_product_definition === product_definition_id) {
            // console.log(" NAUOS on " , product_definition_id, nauos)
            // console.log("  name      =",nauo.related_product_definition._id,nauo.related_product_definition.formation.of_product.name.yellow.bold);
            result.push(nauo.related_product_definition);
        }
    });
    return result;
};


function bindShapeRelationship(reader) {

    "use strict";

    // search for SHAPE_REPRESENTATION_RELATIONSHIP and create links
    var srrs = reader.getObjects("SHAPE_REPRESENTATION_RELATIONSHIP");

    srrs.forEach(function (srr) {
        var sr = srr.rep_1; // shape representation
        sr._____shape = srr.rep_2;
    });
}


function dumpRecursiveNAUOS(reader, pd, level, node) {

    "use strict";

    var sub_parts = reader.find_nauo_relating_to(pd);
    if (sub_parts.length === 0) { return;}

    var sub_node = {label: "nauos", nodes: []};
    node.nodes.push(sub_node);

    sub_parts.forEach(function (rpd) {
        //xx console.log("                   ".substr(0, level * 2) + "  name      =", rpd._id, rpd.formation.of_product.name.yellow.bold);
        sub_node.nodes.push({label: "" + rpd._id + " " + rpd.formation.of_product.name.yellow.bold});
        dumpRecursiveNAUOS(reader, rpd, level + 1, sub_node);
    });
}

function dumpABSR(absr, node) {

    "use strict";

    var items = absr.items;
    items.forEach(function (item) {

        var sub_node = {
            label: item._id + " " + item._class.red,
            nodes: []
        };
        node.nodes.push(sub_node);
        // console.log(" ------------------------=> ", item._id, item._class);
    });
}


var archy = require('archy');
StepReader.prototype.dumpAssemblies = function () {

    "use strict";

    var reader = this;

    var root = {
        label: "assembly",
        nodes: []
    };

    bindShapeRelationship(reader);

    var sdrs = reader.getObjects("SHAPE_DEFINITION_REPRESENTATION");
    var srrs = reader.getObjects("SHAPE_REPRESENTATION_RELATIONSHIP");

    fs.writeFile("toto.out", JSON.stringify({ sdrs: sdrs, srrs: srrs}, null, " "));// util.inspect(sdrs,{depth: 30}));

    sdrs.forEach(function (sdr) {

        var node = {
            label: sdr._id + " SDR:".yellow + sdr.definition.name,
            nodes: []
        };
        var ur_node = {
            label: "used_representation = " + sdr.used_representation._id + " " + sdr.used_representation._class.white,
            nodes: []
        };

        node.nodes.push(ur_node);


        root.nodes.push(node);

        //xx console.log("=================================================================================");
        // console.log(util.inspect(sdr,{ colors: true, depth:10}));
        //xx console.log(" NAME = ".yellow, sdr.definition.name);// , sdr.definition.description.yellow);

        if (sdr.definition.definition._class === 'PRODUCT_DEFINITION') {

            //xx console.log(" name      =", sdr.definition.definition._id, sdr.definition.definition.formation.of_product.name.cyan);
            var sub_node = {
                label: "definition" + " PD:".yellow + sdr.definition.definition._id + " " + sdr.definition.definition.formation.of_product.name.cyan,
                nodes: []
            };
            node.nodes.push(sub_node);

            var pd = sdr.definition.definition;
            dumpRecursiveNAUOS(reader, pd, 1, sub_node);
            //xx var sub_parts = reader.find_nauo_relating_to(pd);
            //xx if  (sub_parts.length > 0 ) thrownew Error("TTT");

        } else {
            node.nodes.push({label: " relating  = " + sdr.definition.definition.relating_product_definition.formation.of_product.name });
            node.nodes.push({label: " related   = " + sdr.definition.definition.related_product_definition.formation.of_product.name  });
            //xx console.log(" relating  = ", sdr.definition.definition.relating_product_definition.formation.of_product.name);
            //xx console.log(" related   = ", sdr.definition.definition.related_product_definition.formation.of_product.name);
        }
        if (sdr.used_representation._class === 'SHAPE_REPRESENTATION') {

            // console.log(util.inspect(sdr.used_representation ,{ colors:true}));
            var items = sdr.used_representation.items;


            items.forEach(function (item) {
                var node;
                if (item._class === 'MAPPED_ITEM') {
                    var mr = item.mapping_source.mapped_representation;
                    //xx console.log(" -------------------> ", mr._id, mr._class);
                    node = {label: "MAPPED_ITEM:" + mr._id + " " + mr._class.yellow, nodes: []};
                    ur_node.nodes.push(node);
                    dumpABSR(mr, node);
                } else if (item._class === "AXIS2_PLACEMENT_3D") {
                    node = {label: item._id + " " + item._class.yellow};
                    ur_node.nodes.push(node);
                    // xx console.log(" -------------------> ", item._id, item._class);
                } else {
                    node = {label: "???:" + item._id + " " + item._class.yellow};
                    ur_node.nodes.push(node);
                    console.log(" ?????-------------------> ", item._id, item._class);
                }
            });

        } else if (sdr.used_representation._class === "ADVANCED_BREP_SHAPE_REPRESENTATION") {

            dumpABSR(sdr.used_representation, ur_node);

        } else {
            ur_node.nodes.push({label: "ERROR : ".red + sdr.used_representation });
            console.log(" ERROR : !!! ".red, sdr.used_representation);
        }
    });

    console.log(archy(root));
};



exports.StepReader = StepReader;
exports.check_STEP_file = check_STEP_file;
exports.buildRegExp = buildRegExp;
exports.buildSimplePattern = buildSimplePattern;
