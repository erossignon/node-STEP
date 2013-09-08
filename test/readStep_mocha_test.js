var STEP = require("../readStep");
var should = require("should");
var assert = require("assert")


describe("test reading anchor.step", function () {

    var reader = new STEP.StepReader();
    before(function (done) {
        reader.read("parts/anchor.step", function (err) {
            assert(err == null)
            done();
        });
    });

    it("should have 5 'product definition's", function (done) {

        reader.getObjects("PRODUCT_DEFINITION").should.have.length(5);
        // console.log(util.inspect(reader.getObjects("PRODUCT_DEFINITION")[0],{ colors: true, depth:10}));
        done();
    });
    it("should have 5 shape representations", function (done) {

        reader.getObjects("SHAPE_REPRESENTATION").should.have.length(5);
        // console.log(util.inspect(reader.getObjects("SHAPE_REPRESENTATION")[0],{ colors: true, depth:10}));
        // console.log(util.inspect(reader.getObjects("SHAPE_REPRESENTATION")[1],{ colors: true, depth:10}));
        // console.log(util.inspect(reader.getObjects("SHAPE_REPRESENTATION")[2],{ colors: true, depth:10}));
        done();
    });
    it("should have 9 shape definition representations", function (done) {

        var sdrs = reader.getObjects("SHAPE_DEFINITION_REPRESENTATION");
        sdrs.should.have.length(9);
        reader.dumpAssemblies();


        done();
    });

});
describe(" read file 1797609in.stp ", function () {
    it(" should parse without error", function (done) {
        var reader = new STEP.StepReader();
        reader.read("./parts/1797609in.stp", function (err) {
            assert(!err);
            reader.dumpStatistics();
            console.log(reader.getLine('1585'));
            Object.keys(reader.indexer.lines).sort().forEach(function (k) {
                // var e = reader.indexer.lines[k];
                // console.log( e._id , e.type,e.line);
            });
            console.log(" nbShapes = ", reader.getObjects("SHAPE_DEFINITION_REPRESENTATION").length);
            done();
        });
    });
});

function testAndDump(filename) {

    describe("test large assembly : " + filename, function () {
        this.timeout(100000);
        var reader = new STEP.StepReader();
        before(function (done) {
            reader.read(/*"parts/Planetary Gearbox.stp"*/filename, function (err) {
               assert(!err);
               done();
            });
        });

        it(" should read without error", function (done) {
            reader.dumpStatistics();
            console.log(" nbShapes = ", reader.getObjects("SHAPE_DEFINITION_REPRESENTATION").length);
            done();
        });
    });
}
testAndDump("parts/Planetary Gearbox.stp");
testAndDump("parts/IAME X30.stp");
testAndDump("parts/407169p088.stp");
testAndDump("parts/vaccase_asm_solid.stp");
testAndDump("parts/instrux_sep13g.stp");

var fs = require("fs");
var path = require("path");
var walk = require("walk");


describe(" testing on all step files", function () {
    this.timeout(100000);
    it(" should parse files", function (done) {
        var nbError = 0;
        // console.log(fs.readdirSync("./parts"));
        var walker = walk.walk('./parts', { followLinks: false });
        walker.on('file', function (root, stat, next) {
            var filename = root + "/" + stat.name;
            var ext = path.extname(filename);
            if (ext != ".stp" && ext != ".step") {
                next();
                return;
            }
            console.log((" file =" + filename).red.bold);
            var reader = new STEP.StepReader();
            reader.read(filename, function (err) {
                assert(!err);
                try {
                    console.log(" nbShapes = ", reader.getObjects("SHAPE_DEFINITION_REPRESENTATION").length);
                }
                catch (err) {
                    reader.dumpStatistics();
                    console.log(" ERROR => ", err);
                    nbError++;
                }
                next();
            });
        });
        walker.on('end', function () {
            nbError.should.equal(0);
            done();
        });
    });
});


