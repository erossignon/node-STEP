var SCHEMA = require("../readExpressSchema");
var should = require("should");
var assert = require("assert");
var M = require("mstring");



describe("test parsing entity",function(){

      it("should parse a ENUMERATION",function(done) {

          var strSchema =
                "TYPE ahead_or_behind = ENUMERATION OF \n"+
                "          (ahead,                     \n"+
                "              behind);                \n"+
                "          END_TYPE; -- ahead_or_behind\n";


          SCHEMA.parseSchema(strSchema,function(err,grammar) {
              if (err) {
                  done(err);
              } else {
                  // console.log("enumerations",JSON.stringify(grammar.enumerations,null," "))
                  grammar.enumerations.should.have.property("ahead_or_behind");

                  grammar.enumerations.ahead_or_behind.type.should.equal("enumeration");
                  grammar.enumerations.ahead_or_behind.enum.should.eql(['ahead','behind']);

                  done();
              }
          });



      });

      it("should parse product definition",function(done){

          var strSchema =M(function() {/***
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
          ***/});

          SCHEMA.parseSchema(strSchema,function(err,grammar) {
              if (err) {
                  done(err);
              } else {
                  // console.log("grammar",JSON.stringify(grammar,null," "))

                  grammar.enumerations.should.have.property("source");
                  grammar.enumerations.source.type.should.equal("enumeration");
                  grammar.enumerations.source.enum.should.eql(['made','bought','not_known']);

                  grammar.entities.should.have.property("product_definition_formation");
                  grammar.entities.product_definition_formation.type.should.equal("entity");

                  grammar.entities.should.have.property("product_definition_formation_with_specified_source");
                  grammar.entities.product_definition_formation_with_specified_source.type.should.equal("entity");
                  done();
              }
          });

      });
      this.timeout(10000);
      it("should parse complete schema",function(done){

          SCHEMA.readSchema("specs/wg3n916_ap203.exp",function(err,grammar) {
             if (err) {
                 done(err);
             } else {
                 grammar.enumerations.should.have.property("source");
                 grammar.enumerations.source.type.should.equal("enumeration");
                 grammar.enumerations.source.enum.should.eql(['made','bought','not_known']);

                 grammar.entities.should.have.property("product_definition_formation");
                 grammar.entities.product_definition_formation.type.should.equal("entity");

                 grammar.entities.should.have.property("product_definition_formation_with_specified_source");
                 grammar.entities.product_definition_formation_with_specified_source.type.should.equal("entity");

                 grammar.entities.should.have.property("surface_of_revolution");
                 grammar.entities.surface_of_revolution.type.should.equal("entity");

                 done();

             }
          });
      });

    it("should buildParsingEngineElement",function(done){

        var strSchema =M(function() {/***
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
          END_TYPE; -- identifier
          TYPE text = STRING;
          END_TYPE; -- identifier
          ENTITY product_context
           SUBTYPE OF (application_context_element);
             discipline_type : label;
          END_ENTITY; -- product_context
        ***/});


        SCHEMA.parseSchema(strSchema,function(err,grammar) {
            if (err) {
                done(err);
            } else {
                var props =grammar.buildProp("product_definition_formation");
                // console.log(" props product_definition_formation = ",props);
                props.should.eql([
                    { name:'id',          type:'S' , class: 'IDENTIFIER'},
                    { name:'description', type:'S' , class: 'TEXT'      },
                    { name:'of_product',  type:'#' , class: 'PRODUCT'   }
                ]);

                props = grammar.buildProp("product_definition_formation_with_specified_source");
                // console.log(" props product_definition_formation_with_specified_source = ",props);
                props.should.eql([
                    {  name: 'id',          type: 'S' ,  class: 'IDENTIFIER' },
                    {  name: 'description', type: 'S' ,  class: 'TEXT'       },
                    {  name: 'of_product',  type: '#' ,  class: 'PRODUCT'    },
                    {  name: 'make_or_buy', type: '@' ,  class: 'SOURCE'     }
                ]);

                props =grammar.buildProp("product");
                // console.log(" props product = ",props);
                props.should.eql([
                    {  name: 'id',                  type: 'S'  , class: 'IDENTIFIER'     },
                    {  name: 'name',                type: 'S'  , class: 'LABEL'          },
                    {  name: 'description',         type: 'S'  , class: 'TEXT'           },
                    {  name: 'frame_of_reference',  type: '[#]', class: 'PRODUCT_CONTEXT'}
                ]);


                done();


            }
        });
    })
});
