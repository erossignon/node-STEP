var STEP = require("./readStep");

var reader = new STEP.StepReader();

reader.read("parts/anchor.step",function(err) {
    if (err) {
        console.log("failure :" + err);
        return;
    }
    var product_definitions = reader.getObjects("PRODUCT_DEFINITION");
    reader.dumpStatistics();
});


