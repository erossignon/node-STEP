# node-STEP

This is a series of nodejs script to analyse and explore STEP (ISO 10303) file format.

This projet provides a very basic EXPRESS grammar 
It focuses in exploring part assemblies inside STEP files as per AP 203.




 ```javascript
 var STEP = require("node-step");

 var reader = new STEP.StepReader();

 reader.read("parts/anchor.step",function(err) {
      if (err) {
        console.log("failure :" + err);
        return;
      }
      var product_definitions = reader.getObjects("PRODUCT_DEFINITION");

 });

