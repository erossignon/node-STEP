var fs = require('fs');

function trim(str) { return str.replace(/^\s+/g,'').replace(/\s+$/g,''); }
function readSchema(filename) {
   

   grammar = {};
 
   fs.readFile(filename,function (err, data ) {
       lines = data.toString().split(/\r\n|\n/ );
       var mode = "None";
       rgEntityStart = /^\s*ENTITY\s*([a-z_]+)\s*/g;
       rgEntityEnd   = /^\s*END_ENTITY.*$/g;
       rgTypeStart   = /^\s*TYPE\s*(\w+)\s*=\s*(.*)/g;
       rgTypeEnd     = /END_TYPE/g;
       rgWhere       = /^\s*WHERE\*/g;
       var matches;
console.log(lines[421]);
console.log(lines[422]);
console.log(lines[423]);
console.log(lines[424]);
console.log(rgTypeEnd.exec(lines[423]));
       var bInWhere = false;
       var subTypeOf, members;

// return;
       lines.forEach(function(line,index,array) {
          line = trim(line);
          if (mode == "None") {

              // is this and ENTITY line ?
              matches = rgEntityStart.exec(line);
              if (matches) {
		  entityName = matches[1];
                  // console.log(" starting entity" , entityName);
                  mode = "ENTITY";
                  bInWhere  = false;
                  subTypeOf = null;
                  members   = [];
                  return;
              } 

              // is this a TYPE line ?
              matches = rgTypeStart.exec(line);
              if (matches) {
                  // console.log("starting Type",matches[1],line);
                  typeName = matches[1]
                  typeDef  = trim(matches[2])
                  console.log(" Type = ",typeName, typeDef);
                  mode = "TYPE";
                  return;
              } 
          } else if (mode == "ENTITY") {
              if (rgEntityEnd.test(line)) { 
                   // -------------------------------- end of entity definition
                   // console.log(" ending entity" , entityName);
                   grammar[entityName] = {
                        type:      "ENTITY",
                        name:      entityName, 
                        subTypeOf: subTypeOf, 
                        props:     members 
                   };
                   mode = "None" ;
                   return;
              }
      	      var rgSubtypeOf = /\s*SUBTYPE OF\s*\((.*)\)\s*/g
              matches = rgSubtypeOf.exec(line);
              if (matches) {
                subTypeOf = matches[1];
              }
              if (rgWhere.exec(line)) { bInWhere = true; }
              if (!bInWhere) {
                  // toto : SET [ 1: ?] OF titi
                  matches = /\s*([a-z0-9_]+)\s*\:\s*SET \[\s*([0-9\?]+)\:\s*([0-9\?]+)\s*\]\s*OF\s*(\w+)/.exec(line);
                  if (matches) { 
                     // console.log(" Found Set", matches);
                  } else {
                    matches = /\s*([a-z0-9_]+)\s*\:\s*(\w+)/.exec(line);
                    if (matches) { 
                      name = matches[1];
                      type = matches[2];
                      members.push({ name: name, type: type});
                   }
                 }
              }

          } else if (mode == "TYPE") {
              if(/END_TYPE/.test(line)) {
                  // console.log(" toto",index, array[index+2]);
                  grammar[typeName] = { 
                     type: "TYPE",
                     name: typeName,
                     definition: typeDef,
                  }; 
                  mode = "None" ; 
                  return; 
              } else {
                   if (line.indexOf("END_TYPE")>=0) {
                       console.log(" Errror");
                       throw new Error("!!!!!!") ;
                   }
              }
          }
       });
       // console.log("data",data.toString());
      
   });
 
}

readSchema("specs/wg3n916_ap203.exp");
exports.readSchema = readSchema;

