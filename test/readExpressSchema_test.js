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

      this.timeout(10000);
      it("should parse complete schema",function(done){

          SCHEMA.readSchema("specs/wg3n916_ap203.exp",done);
      });
});
