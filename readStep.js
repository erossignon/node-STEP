/**
 *  readSTEP :
 *  a tool to  read and interpret a STEP ( AP203 - ISO 10303-21 ) file
 *
 *  Author : Etienne Rossignon ( etienne.rossignon@gadz.org )
 */
var colors = require('colors');
var util = require("util");
var assert = require('assert');
var Table = require('easy-table');

// http://www.steptools.com/support/stdev_docs/express/ap203/html/index.html
waiting_file_type = 1;
waiting_section   = 2; // HEADER; or DATA;
in_header_section = 3;
in_data_section   = 4;
parsing_complete  = 5;

var pattern_ISO_10303_21 = /ISO-10303-21;/  ;
var pattern_HEADER = /HEADER;/;
var pattern_DATA   = /DATA;/;
var pattern_ENDSEC = /ENDSEC;/;


/**
 *
 * @param callback
 * @constructor
 */
var StepIndexer = function(callback) {

    this.lastLine = "";
    this.lines = { };
    this.types = {};
    this.typesRev = {};
    this.callback = callback;

    // pattern for simple step line #123=TOTO(....)
    this.patternSimple = /^(\w+)\s*(\(.*\))\s*;/;

    // pattern for complex line #123=(TOTO(...)TITI(...))
    this.patternComplex = /(\w+)\*(\(.*\))\s*\w/g  ;

    this.startLinePattern = /\#([0-9]+)\s*=\s*(.*)/;  // something like # 123 = ...

    this.curLine = "";

    this.bad_STEP_file = false;

    this.status = waiting_file_type;

    this.header = []; // un parsed header

};

util.inherits(StepIndexer, require("stream"));

StepIndexer.prototype._getTypeIndex = function (strType) {
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
    return str.replace(/^\s+/g, '').replace(/\s+$/g, '');
}

StepIndexer.prototype._splitComplexLine = function (line) {
    var me = this;
    var array = [];
    // IDENTIFIER(x,y,(x,y,e),y)IDENTIFIER2....
    var i = 1;
    var n = line.length - 2;
    var s;
    while (i < n) {
        s = i;
        // skip identifier
        while (line[i] != '(' && i < n) {
            i++;
            if (i >= n) break;
        }
        var identifier = trim(line.substr(s, i - s));

        // console.log( " &&&",identifier.yellow , " = ",i,n)
        // find balanced closing )
        var parLevel = 1  ;
        s = i ;
        i++;
        while ((line[i] != ')') || parLevel !== 1) {
            if (line[i] == ')') parLevel--;
            if (line[i] == '(') parLevel++;
            i++;
            if (i >= n) break;
        }

        var content = line.substr(s, i - s + 1);
        i++;
        //xx console.log(identifier.yellow , " = ",content.bold.blue)
        if (identifier !== '') {
            var typeIndex = me._getTypeIndex(identifier);
            array.push({ type: typeIndex.key, args: content});
        }
    }
    return array;
};


StepIndexer.prototype.write = function (data) {


    var me = this;

    if (me.bad_STEP_file) {
        console.log("bad step");
        return;
    }

    var lines = (this.lastLine + data.toString()).split(/\r\n|\n/);

    this.lastLine = lines.splice(lines.length - 1)[0] ;

    var matches;

    lines.forEach(function (line /*, index, array*/) {

        if (me.bad_STEP_file) {         return;  }


        if(me.status == waiting_file_type) {
            if(pattern_ISO_10303_21.test(line)) {
                me.status = waiting_section;
                return;
            } else {
                me.bad_STEP_file = true;

                // destroy the input stream
                me.input.destroy();
                return;
            }

        }

        if(me.status == waiting_section) {
            if (pattern_HEADER.test(line)) {
                me.status = in_header_section;
                return;
            }  else if (pattern_DATA.test(line)) {
                me.status = in_data_section;
                return;
            } else {
                // console.log(" skipping ",line);
            }

        }
        if (me.status == in_header_section) {

            if (pattern_ENDSEC.test(line)){
                me.status = waiting_section;
                return;
            }
            me.header.push(line);

        } else if (me.status == in_data_section) {

            if (pattern_ENDSEC.test(line)){
                me.status = parsing_complete;
                return;
            }

            matches = me.startLinePattern.exec(line);
            if (matches) {
                me.curNum  = matches[1];
                me.curLine = matches[2];
            } else {
                // console.log(" line = ",line,me.startLinePattern.exec(line));
                me.curLine += line;
            }
            //console.log(" =", me.curLine[me.curLine.length-1]);
            if (me.curLine[me.curLine.length - 1] === ';') {

                matches = me.patternSimple.exec(me.curLine);
                if (matches) {
                    var num = me.curNum;
                    var type = matches[1];
                    if (type == "RODUCT_DEFINITION") {
                        console.log("#".red, me.curNum, ' = ', me.curLine);
                    }
                    var line = matches[2];
                    var typeIndex = me._getTypeIndex(type);
                    var entry = { _id: num, type: typeIndex.key, line: line};
                    me.lines[num] = entry;
                    typeIndex.array.push(num);
                    // if ( type != "CARTESIAN_POINT" && type!="ORIENTED_EDGE" && type!="B_SPLINE_CURVE_WITH_KNOTS" && type!="DIRECTION" && type!="EDGE_CURVE") {
                    //  console.log("type = ",type);
                    //}
                } else {
                    // complex
                    var num = me.curNum;
                    var entry = { _id: num, types: me._splitComplexLine(me.curLine) };
                    me.lines[num] = entry;
                    // console.log("line=", me.curLine);
                    entry.types.forEach(function (element) {
                        var type = element.type;
                        var typeIndex = me._getTypeIndex(type);
                        typeIndex.array.push(num);
                        // console.log(" type = ", type)
                    });

                }
            }
        }
    });
    // console.log(" DATA ");
    // this..apply(this, arguments);
};

function buildRegExp(t) {
    var s = ".*\\(\\s*";
    // BOOLEAN
    t = t.replace(/B/g, "\\s*(\\.T\\.|\\.F\\.|\\*|\\$)\\s*");
    // IDENTIFIER
    t = t.replace(/I/g, "('[^']*'|\\*|\\$)");
    // LABEL
    t = t.replace(/L/g, "('[^']*'|\\*|\\$)");
    // STRING
    t = t.replace(/S/g, "('[^']*'|\\*|\\$)");
    // Set of #
    t = t.replace(/\[#\]/g, "%");
    // ENTITY (#123]
    t = t.replace(/#/g, "#([0-9]+)");
    t = t.replace(/E/g, "#([0-9]+)");
    // ,
    t = t.replace(/,/g, "\\s*,\\s*");
    // SET of #
    t = t.replace(/%/g, "\\(\\s*\([0-9\\s\\#\\,]+\)\\s*\\)");
    // enum
    t = t.replace(/@/g, "\\s*\\.([A-Za-z_]+)\\.\\s*");
    s += t;
    s += ".*\\s*\\)";
    return new RegExp(s);
}

parsers = {};

function buildSimplePattern(props) {
    var s = "";
    props.forEach(function (p) {
        s += "," + p.type;
    });
    return s.slice(1);
}

function registerParser(name, subTypeOf, props) {

    var simplePattern = buildSimplePattern(props);
    var pattern = buildRegExp(simplePattern);
    // console.log(" name = ",name, simplePattern);
    parsers[name] = {
        type: "ENTITY",
        pattern: pattern,
        props: props,
        name: name,
        subTypeOf: subTypeOf
    }
}

function registerSelect(name, select) {
    parsers[name] = {
        type: "SELECT",
        select: select
    };
    // console.log(" name = ",name, select);
}
registerParser('PRODUCT_DEFINITION', "",
    [
        {  name: 'id', type: 'I' },
        {  name: 'description', type: 'S' },
        {  name: 'formation', type: 'E', class: 'PRODUCT_DEFINITION_FORMATION' },
        {  name: 'frame_of_reference', type: 'E', class: 'PRODUCT_DEFINITION_CONTEXT'  }
    ]);
registerParser('PRODUCT_DEFINITION_FORMATION', "",
    [
        {  name: 'id', type: 'I' },
        {  name: 'description', type: 'S' },
        {  name: 'of_product', type: '#', class: 'PRODUCT' }
    ]);

registerParser('PRODUCT_DEFINITION_FORMATION_WITH_SPECIFIED_SOURCE', 'PRODUCT_DEFINITION_FORMATION',
    [
        {  name: 'name', type: 'S' },
        {  name: 'description', type: 'S' },
        {  name: 'of_product', type: '#', class: 'PRODUCT' },
        {  name: 'make_or_buy', type: '@', class: 'SOURCE' }
    ]);
function registerEnum() {
}
registerEnum('SOURCE', ["MADE", "BOUGHT", "NOT_KNOWN"]);

registerParser('PRODUCT_DEFINITION_CONTEXT', "APPLICATION_CONTEXT_ELEMENT",
    [
        {  name: 'name', type: 'S' },
        {  name: 'frame_of_reference', type: 'E', class: 'APPLICATION_CONTEXT' },
        {  name: 'life_cycle_stage', type: 'S' }
    ]);
registerParser('DESIGN_CONTEXT', 'PRODUCT_DEFINITION_CONTEXT',
    [
        {  name: 'name', type: 'S' },
        {  name: 'frame_of_reference', type: 'E', class: 'APPLICATION_CONTEXT' },
        {  name: 'life_cycle_stage', type: 'L'  }
    ]);
registerParser('PRODUCT', "",
    [
        {  name: 'id', type: 'I' },
        {  name: 'name', type: 'L' },
        {  name: 'description', type: 'S' },
        {  name: 'frame_of_reference', type: '[#]', class: 'PRODUCT_CONTEXT' }
    ]);
registerParser('PRODUCT_CONTEXT', 'APPLICATION_CONTEXT_ELEMENT',
    [
        { name: "name", type: 'L' },
        { name: "frame_of_reference", type: '#', class: 'APPLICATION_CONTEXT'},
        { name: "discipline_type", type: 'L' }
    ]);
registerParser('MECHANICAL_CONTEXT', 'PRODUCT_CONTEXT',
    [
        { name: "name", type: 'L' },
        { name: "frame_of_reference", type: '#', class: 'APPLICATION_CONTEXT'},
        { name: "discipline_type", type: 'L' }
    ]);

registerParser('APPLICATION_CONTEXT', "",
    [
        { name: 'application', type: 'S' }
        // { name: 'context_elements'     , type:'[#]' APPLICATION_CONTEXT_ELEMENT
    ]);

registerParser('SHAPE_DEFINITION_REPRESENTATION', "PROPERTY_DEFINITION_REPRESENTATION",
    [
        { name: "definition", type: '#', class: "REPRESENTED_DEFINITION" },
        { name: "used_representation", type: '#', class: "REPRESENTATION"  },

    ]);

registerParser('REPRESENTATION_RELATIONSHIP', '', [
    {  name: "name", type: 'L'  },
    {  name: "description", type: 'S'  },
    {  name: "rep_1", type: '#', class: "REPRESENTATION"  },
    {  name: "rep_2", type: '#', class: "REPRESENTATION"  }
]);
registerParser('REPRESENTATION_RELATIONSHIP_WITH_TRANSFORMATION', 'REPRESENTATION_RELATIONSHIP',
    [
        {  name: "name", type: 'L'  },
        {  name: "description", type: 'S'  },
        {  name: "rep_1", type: '#', class: "REPRESENTATION"  },
        {  name: "rep_2", type: '#', class: "REPRESENTATION"  },
        {  name: "transformation_operator", type: '#', class: "TRANSFORMATION"  }

    ]);
registerParser('SHAPE_REPRESENTATION_RELATIONSHIP', 'REPRESENTATION_RELATIONSHIP',
    [
        {  name: "name", type: 'L'  },
        {  name: "description", type: 'S'  },
        {  name: "rep_1", type: '#', class: "REPRESENTATION"  },
        {  name: "rep_2", type: '#', class: "REPRESENTATION"  }

    ]);

registerParser('SHAPE_DEFINITION_RELATIONSHIP', "REPRESENTATION_RELATIONSHIP",
    [
        {  name: "name", type: 'L'  },
        {  name: "description", type: 'S'  },
        {  name: "rep_1", type: '#', class: "REPRESENTATION"  },
        {  name: "rep_2", type: '#', class: "REPRESENTATION"  }
    ]);

registerSelect("REPRESENTED_DEFINITION", ["PROPERTY_DEFINITION", "PROPERTY_DEFINITION_RELATIONSHIP", "SHAPE_ASPECT"]);

registerParser('PROPERTY_DEFINITION', "",
    [
        { name: "name", type: 'S' },
        { name: "description", type: 'S' },
        { name: "definition", type: '#', class: "CHARACTERIZED_DEFINITION" }
    ]);
registerSelect("CHARACTERIZED_DEFINITION", ["CHARACTERIZED_PRODUCT_DEFINITION", "SHAPE_DEFINITION"]);
registerSelect("CHARACTERIZED_PRODUCT_DEFINITION", ["PRODUCT_DEFINITION", "PRODUCT_DEFINITION_RELATIONSHIP"]);

registerParser('PRODUCT_DEFINITION_SHAPE', "PROPERTY_DEFINITION",
    [
        {  name: 'name', type: 'L' },
        {  name: 'description', type: 'S' },
        {  name: 'definition', type: '#', class: "CHARACTERIZED_DEFINITION" }
    ]);

registerParser("DEFINITION", "", []);

registerParser("PRODUCT_DEFINITION_USAGE", "PRODUCT_DEFINITION_RELATIONSHIP",
    [
    ]);
registerParser("ASSEMBLY_COMPONENT_USAGE", "PRODUCT_DEFINITION_USAGE",
    [
    ]);

registerParser('NEXT_ASSEMBLY_USAGE_OCCURRENCE', "ASSEMBLY_COMPONENT_USAGE",
    [
        {  name: 'id', type: 'I' },
        {  name: 'name', type: 'L' },
        {  name: 'description', type: 'S' },
        {  name: 'relating_product_definition', type: '#', class: 'PRODUCT_DEFINITION'},
        {  name: 'related_product_definition', type: '#', class: 'PRODUCT_DEFINITION'},
        {  name: 'reference_designator', type: 'S'}

    ]);
registerParser('MAPPED_ITEM', "REPRESENTATION_ITEM",
    [
        { name: 'name', type: 'L' },
        { name: 'mapping_source', type: '#', class: "REPRESENTATION_MAP" },
        { name: 'mapping_target', type: '#', class: "REPRESENTATION_ITEM" },

    ]);
registerParser('REPRESENTATION_MAP', '',
    [
        { name: 'mapping_origin', type: '#', class: 'REPRESENTATION_ITEM' },
        { name: 'mapped_representation', type: '#', class: 'REPRESENTATION' },

    ]);
registerParser('AXIS2_PLACEMENT_3D', 'PLACEMENT',
    [
        { name: 'name', type: 'L' },
        { name: 'location', type: '#', class: 'CARTESIAN_POINT' },
        { name: 'axis', type: '#', class: 'DIRECTION' },
        { name: 'ref_direction', type: '#', class: 'DIRECTION' }
    ]);
registerParser('REPRESENTATION_ITEM', '', []);
registerParser('REPRESENTATION_CONTEXT', '',
    [
        { name: 'context_identifier', type: 'I' },
        { name: 'context_type', type: 'S' },
    ]
    ,
    [
        // inverse : representation_in_context : SET [1:?] of representation for context_of_items
        { name: 'representations_in_context', type: '[#]', class: 'REPRESENTATION', for: "context_of_items" }
    ]
);
registerParser('REPRESENTATION', '',
    [
        {  name: 'name', type: 'L' },
        {  name: 'items', type: '[#]', class: 'REPRESENTATION_ITEM' },
        {  name: 'context_of_items', type: '#', class: 'REPRESENTATION_CONTEXT'}
    ]);

registerParser('SHAPE_REPRESENTATION', 'REPRESENTATION',
    [

        {  name: 'name', type: 'L' },
        {  name: 'items', type: '[#]', class: 'REPRESENTATION_ITEM' },
        {  name: 'context_of_items', type: '#', class: 'REPRESENTATION_CONTEXT'}
    ]);

registerParser('ADVANCED_BREP_SHAPE_REPRESENTATION', 'SHAPE_REPRESENTATION',
    [

        {  name: 'name', type: 'L' },
        {  name: 'items', type: '[#]', class: 'REPRESENTATION_ITEM' },
        {  name: 'context_of_items', type: '#', class: 'REPRESENTATION_CONTEXT'}
    ]);

registerParser('FACETED_BREP_SHAPE_REPRESENTATION', 'SHAPE_REPRESENTATION',
    [
        {  name: 'name', type: 'L' },
        {  name: 'items', type: '[#]', class: 'REPRESENTATION_ITEM' },
        {  name: 'context_of_items', type: '#', class: 'REPRESENTATION_CONTEXT'}
    ]);


registerParser('GEOMETRIC_REPRESENTATION_ITEM', 'REPRESENTATION_ITEM', []);
registerParser('SOLID_MODEL', 'GEOMETRIC_REPRESENTATION_ITEM', []);

registerParser('MANIFOLD_SOLID_BREP', "SOLID_MODEL",
    [
        {  name: 'name', type: 'S' },
        {  name: 'outer', type: 'E', class: "CLOSED_SHELL" },
    ]);

registerParser('BREP_WITH_VOIDS', 'MANIFOLD_SOLID_BREP', [
]);
registerParser('FACETED_BREP', 'MANIFOLD_SOLID_BREP', [
]);
registerParser("_CLOSED_SHELL", "CONNECTED_FACE_SET",
    [
        {  name: 'name', type: 'S' },
        {  name: 'cfs_faces', type: '[#]', class: "FACE" },
    ]);

registerParser("REPRESENTATION_ITEM", "", []);

registerParser("TOPOLOGICAL_REPRESENTATION_ITEM", "REPRESENTATION_ITEM", []);

registerParser("FACE", "TOPOLOGICAL_REPRESENTATION_ITEM",
    [
        { name: 'name', type: 'S' },
        { name: 'bounds', type: '[#]', class: "FACE_BOUND" },
    ]);
registerParser("ADVANCED_FACE", "FACE_SURFACE",
    [
        { name: 'name', type: 'S' },
        { name: 'bounds', type: '[#]', class: "FACE_BOUND" },
        { name: 'face_geometry', type: '#', class: 'SURFACE' },
        { name: 'same_sense', type: 'B' }
    ]);


registerParser("FACE_BOUND", "TOPOLOGICAL_REPRESENTATION_ITEM",
    [
        { name: 'name', type: 'S' },
        { name: 'bound', type: '#', class: "LOOP" },
        { name: 'orientation', type: 'B' },
    ]);
registerParser("FACE_OUTER_BOUND", "FACE_BOUND", []);

registerParser("LOOP", "TOPOLOGICAL_REPRESENTATION_ITEM", [ ]);
registerParser("EDGE_LOOP", "TOPOLOGICAL_REPRESENTATION_ITEM",
    [
        { name: 'name', type: 'S' },
        { name: 'edge_list', type: '[#]', class: "ORIENTED_EDGE" },
    ]);

registerParser("SURFACE", "GEOMETRIC_REPRESENTATION_ITEM", []);

registerParser("SHAPE_ASPECT", "", []);
registerParser("STYLED_ITEM", "", []);
registerParser("PACKAGE", "", []);
registerParser("PRODUCT_DEFINITION_WITH_ASSOCIATED_DOCUMENTS", "", []);
registerParser("GEOMETRICALLY_BOUNDED_SURFACE_SHAPE_REPRESENTATION", "", []);
registerParser("CSG_SHAPE_REPRESENTATION", "", []);

StepIndexer.prototype.parse = function (entity, parser) {
    var me = this;

    var obj = {} ;
    obj._id = entity._id;

    if (entity.object) {
        // console.log( "######################################################### already processed ," , entity._id);
        return entity.object;
    }
    if (!parser) {
        if (entity.type) {

            var type = me.typesRev[entity.type];
            parser = parsers[type];
            if (!parser) {
                console.log(" Error !!! cannot get parser for ".red, entity.type, " in ".red, type, entity);
            }
            me._parseType(obj, entity.line, parser);
            // console.log("type ", type,parser);
        } else {
            assert(entity.types instanceof Array);
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

    entity.object = obj;
    entity.line = null;

    return obj;
};

StepIndexer.prototype._parseType = function (obj, entity_line, parser) {
    // console.log("#", obj._id, "  parsing ".cyan,parser.pattern, ' on line ', entity_line);
    var me = this;
    var matches = parser.pattern.exec(entity_line);
    if (!matches) {
        console.log("#", obj._id, parser.name, " cannot parse ".red, parser.pattern, ' on line ', entity_line);
        return {};
    }
    if (matches.length - 1 != parser.props.length) {
        console.log(" warning : not enough element found in ".green);
        console.log(" parsing ", ((parser.pattern) + "").red) ;
        console.log(" on line ", entity_line.cyan);
        console.log(matches);
    }

    if (!obj._class) {
        obj._class = parser.name;
    } else {
        if (obj instanceof Array) {
        } else {
            var tmp = obj._class;
            obj._class = [ tmp ];
        }
        obj._class.push(parser.name);
    }


    for (var i = 0; i < matches.length - 1; i++) {
        var p = parser.props[i];
        var value = matches[i + 1];
        if (p.type === '[#]') {

            var set = [];
            var r = /#([0-9]+),{0,1}/g ;
            var m ;
            while (m = r.exec(value)) {
                set.push(m[1]);
            }

            // console.log(' ------- SET = ', set.slice(0,10), "...");
            // console.log(' -------------------------------------',p.name,p.type," value = ",value);
            // console.log(p.name,p.type," value = ",value);
            value = set;
        }
        obj[p.name] = value;
        if (p.class && parsers[p.class]) {
            var baseType = p.class;

            function process(v) {
                var subline = me.lines[v];
                if (!subline) {
                    console.log(" ERROR !".red, "cannot fine line #", v);
                    throw new Error("Cannot find line");
                }
                if (!subline.hasOwnProperty('type')) {
                    //console.log(" ERROR !".red, subline)
                    // throw new Error("  line has no type");
                    return;
                }
                var subtype = me.typesRev[subline.type];
                // console.log("v=",v,subline);
                // console.log("subtype =", subtype);
                if (parsers[subtype]) {
                    return  me.parse(subline, parsers[subtype]);
                } else {
                    console.log(" Undefined parser for type ", subtype);
                    return v;
                }
            }

            if (value instanceof Array) {
                obj[p.name] = value.map(function (v) {
                    return process(v);
                });
            } else {
                obj[p.name] = process(value);
            }
        }
    }
    // console.log(JSON.stringify(entity));
    return obj;
};


StepIndexer.prototype.end = function (data) {
    assert(data == undefined);
    // console.log(" END with ", data);
    var me = this;
    if (me.status != parsing_complete) {
        me.bad_STEP_file = true;
        me.callback(new Error("Invalid step file"));
    }  else {
        me.callback();
    }
    return;
//// this.write(data);
//    var sdrs = me.types['SHAPE_DEFINITION_REPRESENTATION'].array;
//
//    console.log(sdrs);
//    sdrs.forEach(function (num) {
//        var sdr = me.parse(me.lines[num]);
//        console.log(util.inspect(me.lines[num], {depth: 9, colors: true}));
//    });
//
//    console.log(me.types['PRODUCT_DEFINITION']);
//    var product_definitions = me.types['PRODUCT_DEFINITION'].array;
//    product_definitions.forEach(function (num) {
//        var product_definition = me.parse(me.lines[num], parsers['PRODUCT_DEFINITION']);
//        console.log(util.inspect(me.lines[num], {depth: 9, colors: true}));
//    });
//    me.callback();
//    return;
//
//    var breps1 = me.types['MANIFOLD_SOLID_BREP'];
//    var breps2 = me.types['BREP_WITH_VOIDS'];
//    console.log(" BREP_WITH_VOIDS = ", breps1);
//    breps1.array.forEach(function (num) {
//        var tt = me.typesRev[me.lines[num].type];
//        console.log(tt);
//        var brep = me.parse(me.lines[num], parsers[tt]);
//        console.log(util.inspect(me.lines[num], {depth: 8, colors: true}));
//    });


};

var fs = require("fs");

function readStep(filename, callback) {

    var indexer = new StepIndexer(callback);
    indexer.input = fs.createReadStream(filename);
    indexer.input.pipe(indexer);
    return indexer;
}


/**
 * return true if the file is a correct STEP file
 * a correct STEP fole starts with
 *     ISO-10303-21;
 *     HEADER;
 *
 * @param filename
 */
function check_STEP_file(filename,callback) {
    // "ISO-10303-21;"
    // "HEADER;"
    fs.createReadStream(filename,"r");

    var fileData = "";
    stream.on('data', function(data){
        fileData += data;

        // The next lines should be improved
        var lines = fileData.split("\n");

        if(lines.length >= 2){

            stream.destroy();
            if (!pattern_ISO_10303_21.test(line[0])) {
                callback(new Error("this file is not a STEP FILE : ISO_10303_21 missing"));
            } else {
                callback(null, lines[+line_no]);
            }
        }
    });
    stream.on('error', function(){
        callback('Error', null);
    });

    stream.on('end', function(){
        callback('File end reached without finding line', null);
    });
}
function StepReader() {
}

StepReader.prototype.getObjects = function (className) {
    //return this.indexer.getType[
    var me = this.indexer;
    if (!me.types.hasOwnProperty(className)) {
        return [];
    }
    var arr = me.types[className].array.map(function (num) {
        //console.log(num);
        return me.parse(me.lines[num]);
    });
    return arr;
};

StepReader.prototype.getLine = function (lineNumber) {
    var me = this.indexer;
    return me.lines["" + lineNumber];
};

StepReader.prototype.dumpStatistics = function () {


    var table = new Table({
        head: ['TH 1 label', 'TH 2 label']
        , colWidths: [100, 200]
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
    table.sort(['Count','Type']);
    console.log(table.toString());


    this.dumpAssemblies();
};

StepReader.prototype.read = function (filename, callback) {
    var me = this;
    me.filename = filename;
    me.input = fs.createReadStream(filename);
    this.indexer = new StepIndexer(function (err) {

        if (err) { callback(err); return;}
        callback(null, me);
    });
    this.indexer.input = me.input;
    me.input.pipe(this.indexer);
    return this.indexer;

}

// var s = readStep("parts/anchor.step",function callback() {
//	console.log(" Done");
//});


/**
 * find all nauo (Next Assembly Usage Occurence's) related to a given product definiton
 *
 * @param reader
 * @param product_definition_id
 * @returns {Array}  of product_definition
 */
StepReader.prototype.find_nauo_relating_to = function(product_definition_id) {

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
    // search for SHAPE_REPRESENTATION_RELATIONSHIP and create links
    var srrs = reader.getObjects("SHAPE_REPRESENTATION_RELATIONSHIP");

    srrs.forEach(function (srr) {
        var sr = srr.rep_1; // shape representation
        sr._____shape = srr.rep_2;
    });
}



function dumpRecursiveNAUOS(reader,pd, level,node) {

    var sub_parts = reader.find_nauo_relating_to(pd);
    if (sub_parts.length == 0) return;

    var sub_node = {label: "nauos", nodes:[]};
    node.nodes.push(sub_node);

    sub_parts.forEach(function (rpd) {
        //xx console.log("                   ".substr(0, level * 2) + "  name      =", rpd._id, rpd.formation.of_product.name.yellow.bold);
        sub_node.nodes.push({label: "" + rpd._id+" "+rpd.formation.of_product.name.yellow.bold});
        dumpRecursiveNAUOS(reader,rpd, level + 1,sub_node);
    });
}

function dumpABSR(absr,node) {

    var items = absr.items;
    items.forEach(function (item) {

        var sub_node = {
            label: item._id + " " + item._class.red,
            nodes:[]
        }
        node.nodes.push(sub_node);
        // console.log(" ------------------------=> ", item._id, item._class);
    });
}

var archy = require('archy');
StepReader.prototype.dumpAssemblies = function () {

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
            label: sdr.definition.definition._id + " SDR:".yellow + sdr.definition.name ,
            nodes: []
        };
        var ur_node = {
            label : "used_representation = "+sdr.used_representation._class.white,
            nodes:[]
        };
        node.nodes.push(ur_node);

        root.nodes.push(node);

        //xx console.log("=================================================================================");
        // console.log(util.inspect(sdr,{ colors: true, depth:10}));
        //xx console.log(" NAME = ".yellow, sdr.definition.name);// , sdr.definition.description.yellow);

        if (sdr.definition.definition._class === 'PRODUCT_DEFINITION') {

            //xx console.log(" name      =", sdr.definition.definition._id, sdr.definition.definition.formation.of_product.name.cyan);
            var sub_node = {
                label: "PD:".yellow + sdr.definition.definition._id + " " + sdr.definition.definition.formation.of_product.name.cyan,
                nodes: []
            };
            node.nodes.push(sub_node);

            var pd = sdr.definition.definition;
            dumpRecursiveNAUOS(reader,pd, 1,sub_node);
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

                if (item._class === 'MAPPED_ITEM') {
                    var mr = item.mapping_source.mapped_representation;
                    //xx console.log(" -------------------> ", mr._id, mr._class);
                    var n= {label : "MAPPED_ITEM:" + mr._id + " " +  mr._class.yellow, nodes:[]};
                    ur_node.nodes.push(n);
                    dumpABSR(mr,n);
                } else if (item._class === "AXIS2_PLACEMENT_3D") {
                    var n= {label : item._id + " " +  item._class.yellow};
                    ur_node.nodes.push(n);
                    // xx console.log(" -------------------> ", item._id, item._class);
                } else {
                    var n= {label : "???:" + item._id + " " +  item._class.yellow};
                    ur_node.nodes.push(n);
                    console.log(" ?????-------------------> ", item._id, item._class);
                }
            });

        } else if (sdr.used_representation._class === "ADVANCED_BREP_SHAPE_REPRESENTATION") {

            dumpABSR(sdr.used_representation,ur_node);

        } else {
            ur_node.nodes.push({label: "ERROR : ".red +sdr.used_representation });
            console.log(" ERROR : !!! ".red, sdr.used_representation);
        }
    });

    console.log(archy(root));
}



//xx exports.readStep = readStepreadStep;
exports.StepReader = StepReader;
exports.check_STEP_file = check_STEP_file;