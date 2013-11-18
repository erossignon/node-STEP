var should = require("should");
var assert = require("assert");


var stepIndexer = require('../stepIndexer');



describe(" STEP Indexer",function(){

    it("should split a STEP file properly",function(done){

        var filename = "./parts/1797609in.stp"

        stepIndexer.buildStepIndex(filename,function(err,step_index){

            assert( step_index instanceof stepIndexer.StepIndexer);
            // console.log(step_index.entries);
            step_index.entries['3835'].type.should.equal("CARTESIAN_POINT");
            Object.keys(step_index.entries).length.should.equal(4061);

            done(err);
        });
    });
});



