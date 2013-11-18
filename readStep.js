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
var fs = require("fs");

var check_STEP_file = require("./stepIndexer").check_STEP_file;

var ExpressParser = require("./parseExpressFile").ExpressParser;


var step_grammar = null;

function performInitialisation(done) {

    "use strict";
    if (step_grammar !== null) {
        done();
    } else {
        var SCHEMA = require("./readExpressSchema");

        SCHEMA.readSchema("./specs/wg3n916_ap203.exp", function (err, grammar) {
            if (!err) {
                step_grammar = grammar;
                done();
            } else {
                done(err);
            }
        });
    }
}





function StepReader() {
    "use strict";
}


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
    //"ADVANCED_FACE",
    "FACE_BOUND",
    "FACE_OUTER_BOUND",
    "LOOP",
    "EDGE_LOOP",
    "SURFACE",
    "SHAPE_ASPECT",
    "PRODUCT_DEFINITION_WITH_ASSOCIATED_DOCUMENTS",
    "GEOMETRICALLY_BOUNDED_SURFACE_SHAPE_REPRESENTATION",
    // "TRIMMED_CURVE",
    "DEFINITIONAL_REPRESENTATION",
    "PARAMETRIC_REPRESENTATION_CONTEXT",
    "CARTESIAN_POINT",
    "DIRECTION",
    "CLOSED_SHELL",
    "REPRESENTATION_RELATIONSHIP",
    "REPRESENTATION_RELATIONSHIP_WITH_TRANSFORMATION",
    "SHAPE_REPRESENTATION_RELATIONSHIP",
    "GEOMETRIC_REPRESENTATION_CONTEXT",
    "GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT",
    "GLOBAL_UNIT_ASSIGNED_CONTEXT",
    "REPRESENTATION_CONTEXT"

];

var interesting_types = {};

keys.forEach(function(key){
    "use strict";
    interesting_types[key]=1;
});

function has_an_interesting_type(entity) {

    "use strict";

    if (entity.hasOwnProperty('type')) {
       // simple entity
        return interesting_types.hasOwnProperty(entity.type);
    }
    // complex type
    var c = 0;
    entity.types.forEach(function (e) {
        if (interesting_types.hasOwnProperty(e.type.toUpperCase())) {
            c+=1;
        }
    });
    // console.log(" C= ",c ,entity.types.length);
    if (!(c === 0 || c === entity.types.length)) {
        console.log(" c = ",c," l=",entity.types.length);
        console.log(" @@@@@@@@@@@@@@@@@@@@@@@@@@@@".blue.bold,JSON.stringify(entity,null," "));
    }
    assert( (c === 0 || c === entity.types.length) , " invalid composite entity");

    return c>0;
}
var aaaa = {};
StepReader.prototype.resolve_entity_id = function(entity_id) {

    "use strict";
    var me = this;
    // remove leading #
    if (entity_id[0] === '#' ) {
        entity_id = entity_id.substr(1);
    }
    var entity = me.indexer.entries[entity_id];
    if (entity === undefined) {
        console.log(" cannot find entity id",entity_id);
        return entity_id;
    }

    function _f(entity) {
        if (entity.hasOwnProperty('type'))  {
            return entity.type;
        } else {
            var str = "";
            entity.types.forEach(function(e) { str+= e.type + "/" ;});
            return str;
        }
    }

    if (!has_an_interesting_type(entity)) {
        var s = _f(entity);
        if (!aaaa.hasOwnProperty(s)) {
            console.log(" Not interested in ", _f(entity));
            aaaa[s] = s;
        }
        return entity_id;
    }
    // check if entity is allowed
    if ( entity.type === "NEXT_ASSEMBLY_USAGE_OCCURRENCE") {
        var a =1;
    }
    return me.parse(entity);
};

StepReader.prototype.parse = function(entity) {

    "use strict";
    var me = this;

    if (entity === undefined) {
        return  {};
    }

    // check if object has already been parsed
    if (entity.object) {
        return entity.object;
    }

    var obj = {};
    obj._id = entity._id;

    if (entity.type) {
        //  this is a simple type
        me.expressParser.parseSimpleStepLine(entity.type,entity.raw_data,obj);
    } else {
        // this is a complex type
        me.expressParser.parseComplexStepLine(entity.types,obj);
    }

    // mark the entity as being parsed by caching the resulting object and
    // clearing the original line which is no more required.
    entity.object = obj;
    entity.raw_data = null;

    return obj;
};

StepReader.prototype.getObjects = function (className) {

    "use strict";

    var me = this;
    if (!me.indexer.types.hasOwnProperty(className)) {
        return [];
    }
    return me.indexer.types[className].array.map(function (entity_id) {
        //console.log(num);
        return me.resolve_entity_id(entity_id);
    });
};

StepReader.prototype.getEntity = function (entity_id) {
    "use strict";
    return this.resolve_entity_id(entity_id);
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

        var buildStepIndex = require("./stepIndexer").buildStepIndex;

        buildStepIndex(filename,function (err,indexer) {
            me.indexer = indexer;
            if (err) {
                callback(err);
                return;
            }

            function resolve_entiy(entity_id)  {
                return me.resolve_entity_id(entity_id);
            }
            me.expressParser = new ExpressParser(step_grammar,resolve_entiy);

            callback(null, me);
        });

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

        if (sr !== undefined) {
            sr._____shape = srr.rep_2;
        } else {
            console.log(" file  :".red,reader.filename);
            console.log(" bindShapeRelationship FAILING with".red,JSON.stringify(srr,null," "));
            process.exit();
        }
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

        if (false) {
            console.log("=================================================================================");
            console.log(util.inspect(sdr,{ colors: true, depth:10}));
            console.log(" NAME = ".yellow, sdr.definition.name);// , sdr.definition.description.yellow);
        }

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
