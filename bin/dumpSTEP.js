var STEP = require("../readStep");
var should = require("should");
var util = require("util");

// console.log(process.argv);
var filename = process.argv[2];

console.log(" -------------------------- Dumping STEP file ",filename);
var reader = new STEP.StepReader();
reader.read(filename,function(err) {
   reader.dumpStatistics();
});

