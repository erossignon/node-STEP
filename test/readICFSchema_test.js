var SCHEMA = require("../readExpressSchema");
var should = require("should");
var assert = require("assert");
var M = require("mstring");

var ExpressParser = require("../parseExpressFile").ExpressParser;

describe("ICF specification",function() {

    var this_grammar ={};

    before(function(done){
        SCHEMA.readSchema("specs/IFC4_ADD2.exp", function (err, grammar) {
            if (err) {
                done(err);
            } else {
                this_grammar = grammar;
                done();
            }
        });
    });

    it("should parse the ICF specification",function(done){

        done();
    });
})