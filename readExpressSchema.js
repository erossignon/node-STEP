var fs = require('fs');


function parseSchema(input,callback) {
    var parser = require("./express_parser").parser;
    parser.yy.grammar ={}      ;
    var success = parser.parse(input);
    // console.log(parser);
    if (!success)  {
        callback(new Error("Error !"),null)
    } else {
        callback(null,parser.yy.grammar);
    }

}

function readSchema(filename,callback) {

    var source  = fs.readFileSync(filename,"utf8");

    parseSchema(source,callback);

}


exports.readSchema = readSchema;
exports.parseSchema = parseSchema;

