var SCHEMA = require("../readExpressSchema");
var should = require("should");
var assert = require("assert");



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
                  console.log("grammar",JSON.stringify(grammar,null," "))
                  grammar.should.have.property("ahead_or_behind");

                  grammar.ahead_or_behind.type.should.equal("enumeration");
                  grammar.ahead_or_behind.enum.should.eql(['ahead','behind']);

                  done();
              }
          });



      });

      it("should parse product definition",function(done){

          var strSchema =
             " TYPE source = ENUMERATION OF  \n"+
             "  (made,                       \n"+
             "   bought,                     \n"+
             "   not_known);                 \n"+
             " END_TYPE; -- source           \n"+
             "          \n"+
             " ENTITY product_definition_formation; \n"+
             "          id          : identifier;      \n"+
             "          description : text;            \n"+
             "          of_product  : product;         \n"+
             "          UNIQUE                         \n"+
             "          ur1 : id, of_product;         \n"+
             " END_ENTITY; -- product_definition_formation\n"+
             "          \n"+
             " ENTITY product_definition_formation_with_specified_source      \n"+
             "   SUBTYPE OF (product_definition_formation);                   \n"+
             "   make_or_buy : source;                                        \n"+
             " END_ENTITY; -- product_definition_formation_with_specified_source\n"+
             "    \n"
             ;

          SCHEMA.parseSchema(strSchema,function(err,grammar) {
              if (err) {
                  done(err);
              } else {
                  // console.log("grammar",JSON.stringify(grammar,null," "))

                  grammar.should.have.property("source");
                  grammar.source.type.should.equal("enumeration");
                  grammar.source.enum.should.eql(['made','bought','not_known']);

                  grammar.should.have.property("product_definition_formation");
                  grammar.product_definition_formation.type.should.equal("entity");

                  grammar.should.have.property("product_definition_formation_with_specified_source");
                  grammar.product_definition_formation_with_specified_source.type.should.equal("entity");
                  done();
              }
          });

      });
      this.timeout(10000);
      it("should parse complete schema",function(done){

          SCHEMA.readSchema("specs/wg3n916_ap203.exp",done);
      });
});
