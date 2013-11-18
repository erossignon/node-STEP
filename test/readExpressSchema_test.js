var SCHEMA = require("../readExpressSchema");
var should = require("should");
var assert = require("assert");
var M = require("mstring");

var ExpressParser = require("../parseExpressFile").ExpressParser;


describe("test parsing entity", function () {

    it("should parse a ENUMERATION", function (done) {

        var strSchema =
            "TYPE ahead_or_behind = ENUMERATION OF \n" +
                "          (ahead,                     \n" +
                "              behind);                \n" +
                "          END_TYPE; -- ahead_or_behind\n";


        SCHEMA.parseSchema(strSchema, function (err, grammar) {
            if (err) {
                done(err);
            } else {
                // console.log("enumerations",JSON.stringify(grammar.enumerations,null," "))
                grammar.enumerations.should.have.property("ahead_or_behind");

                grammar.enumerations.ahead_or_behind.type.should.equal("enumeration");
                grammar.enumerations.ahead_or_behind.enum.should.eql(['ahead', 'behind']);

                done();
            }
        });


    });

    it("should parse product definition", function (done) {

        var strSchema = M(function () {/***
         TYPE source = ENUMERATION OF
                 (made,bought,not_known);
         END_TYPE; -- source

         TYPE identifier = STRING;
         END_TYPE; -- identifier

         TYPE label = STRING;
         END_TYPE; -- label

         TYPE text = STRING;
         END_TYPE; -- text

         ENTITY product_definition_formation;
            id          : identifier;
            description : text;
            of_product  : product;
         UNIQUE
            ur1 : id, of_product;
         END_ENTITY; -- product_definition_formation

         ENTITY product_definition_formation_with_specified_source
            SUBTYPE OF (product_definition_formation);
            make_or_buy : source;
         END_ENTITY; -- product_definition_formation_with_specified_source

         ENTITY product;
         END_ENTITY;

         ***/
        });

        SCHEMA.parseSchema(strSchema, function (err, grammar) {
            if (err) {
                done(err);
            } else {
                // console.log("grammar",JSON.stringify(grammar,null," "))

                grammar.enumerations.should.have.property("source");
                grammar.enumerations.source.type.should.equal("enumeration");
                grammar.enumerations.source.enum.should.eql(['made', 'bought', 'not_known']);

                grammar.entities.should.have.property("product_definition_formation");
                grammar.entities.product_definition_formation.type.should.equal("entity");

                grammar.entities.should.have.property("product_definition_formation_with_specified_source");
                grammar.entities.product_definition_formation_with_specified_source.type.should.equal("entity");


                var parser = new ExpressParser(grammar);

                var obj = {};
                parser.parseSimpleStepLine("PRODUCT_DEFINITION_FORMATION","('toto','titi',#1200)",obj);
                // console.log("obj = ",obj);
                obj.should.have.property('id');
                obj.should.have.property('description');
                obj.should.have.property('of_product');

                var obj2 = {};
                parser.parseSimpleStepLine("PRODUCT_DEFINITION_FORMATION_WITH_SPECIFIED_SOURCE",
                                           "('id_of_product','description of product',#1200,.NOT_KNOWN.)",obj2);
                // console.log("obj = ",obj);
                obj2.should.have.property('id');
                obj2.should.have.property('description');
                obj2.should.have.property('of_product');

                done();
            }
        });

    });

    it("should buildParsingEngineElement", function (done) {

        var strSchema = M(function () {/***
         TYPE source = ENUMERATION OF
         (made,
         bought,
         not_known);
         END_TYPE; -- source

         ENTITY product_definition_formation;
         id          : identifier;
         description : text;
         of_product  : product;
         UNIQUE
         ur1 : id, of_product;
         END_ENTITY; -- product_definition_formation

         ENTITY product_definition_formation_with_specified_source
         SUBTYPE OF (product_definition_formation);
         make_or_buy : source;
         END_ENTITY; -- product_definition_formation_with_specified_source
         ENTITY product;
         id                 : identifier;
         name               : label;
         description        : text;
         frame_of_reference : SET [1:?] OF product_context;
         UNIQUE
         ur1 : id;
         END_ENTITY; -- product
         TYPE identifier = STRING;
         END_TYPE; -- identifier
         TYPE label = STRING;
         END_TYPE; -- label
         TYPE text = STRING;
         END_TYPE; -- text
         ENTITY product_context
         SUBTYPE OF (application_context_element);
         discipline_type : label;
         END_ENTITY; -- product_context
         ***/
        });


        SCHEMA.parseSchema(strSchema, function (err, grammar) {
            if (err) {
                done(err);
            } else {

                var props = grammar.buildProp("product_definition_formation");
                // console.log(" props product_definition_formation = ",props);
                props.should.eql([
                    { name: 'id', type: 'S', class: 'IDENTIFIER'},
                    { name: 'description', type: 'S', class: 'TEXT'      },
                    { name: 'of_product', type: '#', class: 'PRODUCT'   }
                ]);

                props = grammar.buildProp("product_definition_formation_with_specified_source");
                // console.log(" props product_definition_formation_with_specified_source = ",props);
                props.should.eql([
                    {  name: 'id', type: 'S', class: 'IDENTIFIER' },
                    {  name: 'description', type: 'S', class: 'TEXT'       },
                    {  name: 'of_product', type: '#', class: 'PRODUCT'    },
                    {  name: 'make_or_buy', type: '@', class: 'SOURCE'     }
                ]);

                props = grammar.buildProp("product");
                // console.log(" props product = ",props);
                props.should.eql([
                    {  name: 'id', type: 'S', class: 'IDENTIFIER'     },
                    {  name: 'name', type: 'S', class: 'LABEL'          },
                    {  name: 'description', type: 'S', class: 'TEXT'           },
                    {  name: 'frame_of_reference', type: '[#]', class: 'PRODUCT_CONTEXT'}
                ]);


                done();


            }
        });
    });

    it("should handle direction properly", function (done) {

        var strSchema = M(function () {/***
         ENTITY representation_item;
            name : label;
            WHERE
                wr1: (SIZEOF(using_representations(SELF)) > 0);
         END_ENTITY; -- representation_item

         ENTITY geometric_representation_item
                SUPERTYPE OF (ONEOF (   point,direction,vector,placement,
                                        cartesian_transformation_operator,curve,surface,edge_curve,
                                        face_surface,poly_loop,vertex_point,solid_model,
                                        shell_based_surface_model,shell_based_wireframe_model,
                                        edge_based_wireframe_model,geometric_set))
                SUBTYPE OF (representation_item);
                DERIVE
                    dim : dimension_count := dimension_of(SELF);
                WHERE
                    wr1: (SIZEOF(QUERY ( using_rep <* using_representations(SELF) | (
                    NOT (
                         'CONFIG_CONTROL_DESIGN.GEOMETRIC_REPRESENTATION_CONTEXT' IN
                            TYPEOF(using_rep.context_of_items))) )) = 0);
         END_ENTITY; -- geometric_representation_item


        TYPE vector_or_direction = SELECT
           (vector,direction);
        END_TYPE; -- vector_or_direction

        ENTITY direction
            SUBTYPE OF (geometric_representation_item);
            direction_ratios : LIST [2:3] OF REAL;
            WHERE
                wr1: (SIZEOF(QUERY ( tmp <* direction_ratios | (tmp <> 0) )) > 0);
        END_ENTITY; -- direction


         ENTITY vector
            SUBTYPE OF (geometric_representation_item);
            orientation : direction;
            magnitude   : length_measure;
         WHERE
            wr1: (magnitude >= 0);
         END_ENTITY; -- vector

        ***/});

        SCHEMA.parseSchema(strSchema, function (err, grammar) {
            if (err) {
                done(err);
            } else {

                done();
            }
        });

    });

    it("should handle cartesian point list ",function(done){

        var strSchema = M(function () {/***
         ENTITY representation_item;
             name : label;
             WHERE
             wr1: (SIZEOF(using_representations(SELF)) > 0);
         END_ENTITY; -- representation_item

         ENTITY geometric_representation_item
             SUPERTYPE OF (ONEOF (   point,direction,vector,placement,
             cartesian_transformation_operator,curve,surface,edge_curve,
             face_surface,poly_loop,vertex_point,solid_model,
             shell_based_surface_model,shell_based_wireframe_model,
             edge_based_wireframe_model,geometric_set))
             SUBTYPE OF (representation_item);
             DERIVE
             dim : dimension_count := dimension_of(SELF);
             WHERE
             wr1: (SIZEOF(QUERY ( using_rep <* using_representations(SELF) | (
             NOT (
             'CONFIG_CONTROL_DESIGN.GEOMETRIC_REPRESENTATION_CONTEXT' IN
             TYPEOF(using_rep.context_of_items))) )) = 0);
         END_ENTITY; -- geometric_representation_item

         ENTITY point
            SUPERTYPE OF (ONEOF (cartesian_point,point_on_curve,point_on_surface,
                                 point_replica,degenerate_pcurve))
            SUBTYPE OF (geometric_representation_item);
         END_ENTITY; -- point

        ENTITY cartesian_point
            SUBTYPE OF (point);
            coordinates : LIST [1:3] OF length_measure;
        END_ENTITY; -- cartesian_point
        ***/});

        SCHEMA.parseSchema(strSchema, function (err, grammar) {
            if (err) {
                done(err);
            } else {

                done();
            }
        });
    });


    it("should deal with advanced_face",function(done){

        /***
         *                                ADVANCED_FACE
         *                                     |
         *                                     |
         *                                FACE_SURFACE
         *                                     |
         *                    +----------------+--------------------+
         *                    |                                     |
         *                  FACE                     GEOMETRIC_REPRESENTATION_ITEM
         *                    |                                     |
         *      TOPOLOGICAL_REPRESENTATION_ITEM                     |
         *                    |                                     |
         *                    +-------------+     +-----------------+
         *                                  |     |
         *                           REPRESENTATION_ITEM
         * @type {*}
         */
        var strSchema = M(function () {/***

        TYPE label = STRING;
        END_TYPE; -- label

        ENTITY advanced_face
            SUBTYPE OF (face_surface);
        END_ENTITY;

        ENTITY face_surface
           SUBTYPE OF (face, geometric_representation_item);
           face_geometry : surface;
           same_sense    : BOOLEAN;
        END_ENTITY; -- face_surface


        ENTITY face
          SUPERTYPE OF (ONEOF (face_surface,oriented_face))
          SUBTYPE OF (topological_representation_item);
          bounds : SET [1:?] OF face_bound;
          WHERE
              wr1: (NOT mixed_loop_type_set(list_to_set(list_face_loops(SELF))));
              wr2: (SIZEOF(QUERY ( temp <* bounds | ( 'CONFIG_CONTROL_DESIGN.FACE_OUTER_BOUND' IN TYPEOF(temp)) ))<= 1);
        END_ENTITY; -- face


        ENTITY topological_representation_item
          SUPERTYPE OF (ONEOF (vertex,edge,face_bound,face,vertex_shell,wire_shell,connected_edge_set,connected_face_set,loop ANDOR path))
          SUBTYPE OF (representation_item);
        END_ENTITY; -- topological_representation_item

        ENTITY representation_item;
           name : label;
           WHERE
             wr1: (SIZEOF(using_representations(SELF)) > 0);
        END_ENTITY; -- representation_item

        ENTITY geometric_representation_item
            SUPERTYPE OF (ONEOF (point,direction,vector,placement,cartesian_transformation_operator,curve,
                                 surface,edge_curve,face_surface,poly_loop,vertex_point,solid_model,
                                 shell_based_surface_model,shell_based_wireframe_model,
                                 edge_based_wireframe_model,geometric_set))
            SUBTYPE OF (representation_item);
            DERIVE
               dim : dimension_count := dimension_of(SELF);
            WHERE
                wr1: (SIZEOF(QUERY ( using_rep <* using_representations(SELF) | (
                      NOT ('CONFIG_CONTROL_DESIGN.GEOMETRIC_REPRESENTATION_CONTEXT' IN TYPEOF(using_rep.context_of_items))) )) = 0);
        END_ENTITY; -- geometric_representation_item

        ENTITY face_bound
           SUBTYPE OF (topological_representation_item);
           bound       : loop;
           orientation : BOOLEAN;
        END_ENTITY; -- face_bound

        ENTITY surface
             SUPERTYPE OF (ONEOF (elementary_surface,swept_surface,bounded_surface,
             offset_surface,surface_replica))
             SUBTYPE OF (geometric_representation_item);
        END_ENTITY; -- surface

        ENTITY loop
            ;
        END_ENTITY;
        ***/});


        SCHEMA.parseSchema(strSchema, function (err, grammar) {
            if (err) {
                done(err);
            } else {
                var props = grammar.buildProp("advanced_face");
                // console.log(" props product_definition_formation = ",props);
                props.should.eql([
                    { name: 'name',          type: 'S'  , class: 'LABEL'           },
                    { name: 'bounds',        type: '[#]', class: 'FACE_BOUND'      },
                    { name: 'face_geometry', type: '#'  , class: 'SURFACE'         },
                    { name: 'same_sense',    type: 'B'  , class: 'BOOLEAN'         }
                ]);


                var parser = new ExpressParser(grammar);

                // #30=ADVANCED_FACE('',(#31,#34),#7315,.F.);
                var obj = {};
                parser.parseSimpleStepLine("ADVANCED_FACE","('',(#31,#34),#7315,.F.)",obj);
                // console.log("obj = ",obj);
                obj.should.have.property('name');
                obj.should.have.property('bounds');
                obj.should.have.property('face_geometry');
                obj.should.have.property('same_sense');


                done();
            }
        });
    });
    it("should parse a complex line",function(done) {

         //example:
         //    #24=(GEOMETRIC_REPRESENTATION_CONTEXT(3)
         //         GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((#23))
         //         GLOBAL_UNIT_ASSIGNED_CONTEXT((#22,#17,#19))
         //         REPRESENTATION_CONTEXT(' ',' ')
         //        );

        var strSchema = M(function () {/***

             TYPE identifier = STRING;
             END_TYPE; -- identifier

             TYPE text = STRING;
             END_TYPE; -- text

             TYPE dimension_count = INTEGER;
                 WHERE
                     wr1: (SELF > 0);
             END_TYPE; -- text

             ENTITY geometric_representation_context
                 SUBTYPE OF (representation_context);
                 coordinate_space_dimension : dimension_count;
             END_ENTITY; -- geometric_representation_context

             ENTITY global_uncertainty_assigned_context
                 SUBTYPE OF (representation_context);
                 uncertainty : SET [1:?] OF uncertainty_measure_with_unit;
             END_ENTITY; -- global_uncertainty_assigned_context

             ENTITY global_unit_assigned_context
                 SUBTYPE OF (representation_context);
                 units : SET [1:?] OF unit;
             END_ENTITY; -- global_unit_assigned_context

             ENTITY representation_context;
                 context_identifier : identifier;
                 context_type       : text;
                 INVERSE
                    representations_in_context : SET [1:?] OF representation FOR context_of_items;
             END_ENTITY; -- representation_context

             ENTITY uncertainty_measure_with_unit;
             END_ENTITY; -- uncertainty_measure_with_unit
             ENTITY unit;
             END_ENTITY; -- unit


         ***/});
        SCHEMA.parseSchema(strSchema, function (err, grammar) {
            if (err) {
                done(err);
            } else {

                var elements = [
                    { type: "GEOMETRIC_REPRESENTATION_CONTEXT" ,    raw_data: "(3)"  },
                    { type: "GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT" , raw_data: "((#23))"  },
                    { type: "GLOBAL_UNIT_ASSIGNED_CONTEXT" ,        raw_data: "((#22,#17,#19))"  },
                    { type: "REPRESENTATION_CONTEXT"       ,        raw_data: "('','')"  }
                ];
                var obj = {};
                var parser = new ExpressParser(grammar);

                parser.parseComplexStepLine(elements,obj);

                done();
            }
        });

    });

});

describe(" testing with complete schema",function(){

    "use strict" ;

    this.timeout(10000);
    var this_grammar ={};

    before(function(done){
        SCHEMA.readSchema("specs/wg3n916_ap203.exp", function (err, grammar) {
            if (err) {
                done(err);
            } else {
                this_grammar = grammar;
                done();
            }
        });
    });

    it("should parse complete schema", function (done) {

        var grammar = this_grammar;

        grammar.enumerations.should.have.property("source");
        grammar.enumerations.source.type.should.equal("enumeration");
        grammar.enumerations.source.enum.should.eql(['made', 'bought', 'not_known']);

        grammar.entities.should.have.property("product_definition_formation");
        grammar.entities.product_definition_formation.type.should.equal("entity");

        grammar.entities.should.have.property("product_definition_formation_with_specified_source");
        grammar.entities.product_definition_formation_with_specified_source.type.should.equal("entity");

        grammar.entities.should.have.property("surface_of_revolution");
        grammar.entities.surface_of_revolution.type.should.equal("entity");

        done();
    });

    it("should have a next_assembly_usage_occurrence",function() {

        var grammar = this_grammar;

        console.log("--------------");
        grammar.entities.should.have.property("next_assembly_usage_occurrence");
        var e = grammar.entities["next_assembly_usage_occurrence"];
        console.log( JSON.stringify(e,null," "));

        console.log("--------------");
        grammar.entities.should.have.property("assembly_component_usage");
        e = grammar.entities["assembly_component_usage"];
        console.log( JSON.stringify(e,null," "));

        console.log("--------------");
        grammar.entities.should.have.property("product_definition_usage");
        e = grammar.entities["product_definition_usage"];
        console.log( JSON.stringify(e,null," "));

        console.log("--------------");
        grammar.entities.should.have.property("product_definition_relationship");
        e = grammar.entities["product_definition_relationship"];
        console.log( JSON.stringify(e,null," "));

        var props = grammar.buildProp("next_assembly_usage_occurrence");
        console.log(" props product = ",props);

    });
});
