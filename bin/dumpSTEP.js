var STEP = require("../readStep");
var should = require("should");

// console.log(process.argv);
var filename = process.argv[2];

console.log(" -------------------------- Dumping STEP file ",filename);

var reader = new STEP.StepReader();
reader.read(filename,function(err) {
   if (err ) {
      console.log(" ERROR : ", err);
   } else {
      reader.dumpStatistics();
   }
});

