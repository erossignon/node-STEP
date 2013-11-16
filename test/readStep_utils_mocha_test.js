var STEP = require("../readStep");
var should = require("should");
var assert = require("assert");


describe("test buildRegExp", function () {

    it("buildRegExp should create a correct RegExp with #", function (done) {

        var reg = STEP.buildRegExp("#");
        console.log(reg);

        var matches = reg.exec("(#123)");
        // console.log(matches);
        matches.length.should.be.equal(2);
        matches[1].should.equal('123');

        matches = reg.exec("unused stuff (   #123  ) ");
        // console.log(matches);
        matches.length.should.be.equal(2);
        matches[1].should.equal('123');

        done();

    });

    it("buildRegExp should create a correct RegExp with S", function (done) {

        var reg = STEP.buildRegExp("S");
        console.log(reg);

        var matches = reg.exec("('some_text')");
        // console.log(matches);
        matches.length.should.be.equal(2);
        matches[1].should.equal("'some_text'");

        matches = reg.exec("unused( '123' ) ");
        // console.log(matches);
        matches.length.should.be.equal(2);
        matches[1].should.equal("'123'");


        matches = reg.exec("unused( * ) ");
        matches.length.should.be.equal(2);
        matches[1].should.equal("*");

        matches = reg.exec("unused($) ");
        matches.length.should.be.equal(2);
        matches[1].should.equal("$");

        done();

    });
    it("buildRegExp should create a correct RegExp with B", function (done) {

        var reg = STEP.buildRegExp("B");
        console.log(reg);

        var matches = reg.exec("( .T. )");
        // console.log(matches);
        matches.length.should.be.equal(2);
        matches[1].should.equal(".T.");

        matches = reg.exec("unused( .F. ) ");
        // console.log(matches);
        matches.length.should.be.equal(2);
        matches[1].should.equal(".F.");

        matches = reg.exec("unused( * ) ");
        // console.log(matches);
        matches.length.should.be.equal(2);
        matches[1].should.equal("*");

        matches = reg.exec("unused( $ ) ");
        // console.log(matches);
        matches.length.should.be.equal(2);
        matches[1].should.equal("$");

        done();

    });
    it('buildRegExp should create a correct RegExp with #,B,S', function(done) {
        var reg = STEP.buildRegExp("#,B,S");
        console.log(reg);

        var matches = reg.exec("(#123,.T.,'toto')");
        // console.log(matches);
        matches.length.should.be.equal(4);
        matches[1].should.equal("123");
        matches[2].should.equal(".T.");
        matches[3].should.equal("'toto'");

        done();
    });
    it('buildRegExp should create a correct RegExp with [#]', function(done) {

        var reg = STEP.buildRegExp("[#]");
        console.log(reg);

        var matches = reg.exec("( ( #123, #456, #789 ) )");
        // console.log(matches);
        matches.length.should.be.equal(2);
        matches[1].should.equal("#123, #456, #789 ");

        done();
    });
});


describe("test buildSimplePattern",function(){

    it("buildSimplePattern with 2 props ... 'S#'",function(done){

        props =[
            {
               name: "toto",
               type: "S"
            },
            {
                name: "toto",
                type: "#"

            }];

        var str = STEP.buildSimplePattern(props);

        str.should.equal("S,#");

        done();



    });

});




