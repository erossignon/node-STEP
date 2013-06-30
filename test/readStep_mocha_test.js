var STEP = require("../readStep");
var should = require("should");
var util = require("util");


function dumpAssemblies(reader) {
          var sdrs = reader.getObjects("SHAPE_DEFINITION_REPRESENTATION");
          fs.writeFile("toto.out",JSON.stringify({ array: sdrs},null," "));// util.inspect(sdrs,{depth: 30}));
          sdrs.forEach(function(sdr){ 
	            console.log("=================================================================================");
                    // console.log(util.inspect(sdr,{ colors: true, depth:10}));
                    console.log(" NAME = ".yellow ,sdr.definition.name , sdr.definition.description.yellow); 
                    if ( sdr.definition.definition._class === 'PRODUCT_DEFINITION') {
                      console.log(" name      =",sdr.definition.definition.formation.of_product.name.cyan)
                    } else {
                      console.log(" relating  = ",sdr.definition.definition.relating_product_definition.formation.of_product.name);
                      console.log(" related   = ",sdr.definition.definition.related_product_definition.formation.of_product.name);
                    }
                    if ( sdr.used_representation._class === 'SHAPE_REPRESENTATION') {
                        // console.log(util.inspect(sdr.used_representation ,{ colors:true}));
                        var items = sdr.used_representation.items;

                        items.forEach(function(item) {
                           if (item._class === 'MAPPED_ITEM') {
                              var mr = item.mapping_source.mapped_representation;
                              console.log(" -------------------> ", mr._id, mr._class);
                              dumpABSR(mr);
                        } else {
                        };
                     });
                   } else if ( sdr.used_representation._class === "ADVANCED_BREP_SHAPE_REPRESENTATION") {
                        dumpABSR(sdr.used_representation);
 			function dumpABSR(absr) {
                            var items = absr.items;
                            items.forEach(function(item) { 
                               console.log(" ------------------------=> ", item._id, item._class );
                             }); 
                        };
                   } else {
                        console.log(" ERROR : !!! ", sdr.used_representation);
                   }
          });
};

describe("test reading anchor.step", function() {
 
   var reader = new STEP.StepReader();
   before(function( done) {
      reader.read("parts/anchor.step",function(err) {
          done();
      });
   });

   it("should have 6 'product definition's",function( done) {

          reader.getObjects("PRODUCT_DEFINITION").should.have.length(6);
          // console.log(util.inspect(reader.getObjects("PRODUCT_DEFINITION")[0],{ colors: true, depth:10}));
          done();
   });
   it("should have 5 shape representations",function( done) {
         
         reader.getObjects("SHAPE_REPRESENTATION").should.have.length(5);
         // console.log(util.inspect(reader.getObjects("SHAPE_REPRESENTATION")[0],{ colors: true, depth:10}));
         // console.log(util.inspect(reader.getObjects("SHAPE_REPRESENTATION")[1],{ colors: true, depth:10}));
         // console.log(util.inspect(reader.getObjects("SHAPE_REPRESENTATION")[2],{ colors: true, depth:10}));
         done();
   });
   it("should have 9 shape definition representations",function( done) {
          
          var sdrs = reader.getObjects("SHAPE_DEFINITION_REPRESENTATION");
          sdrs.should.have.length(9);
          dumpAssemblies(reader);


          done();
   });

});
describe(" read file 1797609in.stp " , function() {
   it(" should parse without error", function(done) {
      var reader = new STEP.StepReader();
      reader.read("./parts/1797609in.stp",function(err) {
         reader.dumpStatistics();
         console.log(reader.getLine('1585'))
         Object.keys(reader.indexer.lines).sort().forEach(function(k) {
           // var e = reader.indexer.lines[k];
           // console.log( e._id , e.type,e.line);
         });
         console.log(" nbShapes = ", reader.getObjects("SHAPE_DEFINITION_REPRESENTATION").length);
         done();
      });
   });
});

function testAndDump(filename) {

  describe("test large assembly : " + filename, function() {
    var reader = new STEP.StepReader();
    before(function( done) {
      reader.read(/*"parts/Planetary Gearbox.stp"*/filename,function(err) {
          done();
      });
    });

    it(" should read without error", function(done) {
       reader.dumpStatistics();
       dumpAssemblies(reader);
       console.log(" nbShapes = ", reader.getObjects("SHAPE_DEFINITION_REPRESENTATION").length);
       done();
     });
   });
}
testAndDump("parts/Planetary Gearbox.stp");
testAndDump("parts/IAME X30.stp");
testAndDump("parts/407169p088.stp");

var fs  =require("fs");
var path = require("path");
var walk = require("walk");
describe(" testing on all step files",function() {
   this.timeout(100000);
   it(" should parse files" , function(done) {
       var nbError = 0;
       // console.log(fs.readdirSync("./parts"));
       var walker = walk.walk('./parts', { followLinks: false });
       walker.on('file',function(root,stat,next) { 
            var filename = root + "/" + stat.name;
            var ext = path.extname(filename);
            if ( ext != ".stp" && ext!= ".step") {
               next();
               return;
            }
            console.log((" file =" + filename).red.bold);
            var reader = new STEP.StepReader();
            reader.read(filename,function(err) {
               try  {
                  console.log(" nbShapes = ", reader.getObjects("SHAPE_DEFINITION_REPRESENTATION").length);
               } 
               catch(err) { 
                  reader.dumpStatistics();
                  console.log(" ERROR => ", err);
                  nbError ++;
               }
               next();
            });
       });      
       walker.on('end',function() {
           nbError.should.equal(0);
           done();
       });
   });
});


