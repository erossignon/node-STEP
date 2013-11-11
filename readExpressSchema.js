var fs = require('fs');


var Grammar = function() {

    this._elements={};
    this._enumerations ={};
    this._entities = {};

    Object.defineProperty(this,"enumerations",{
        get: function() { return this._enumerations; },
        set: function(value) {
           throw new Error("cannot set enumeration")
        }
    });
    Object.defineProperty(this,"entities",{
        get: function() { return this._entities; },
        set: function(value) {
            throw new Error("cannot set entities")
        }
    });
};

Grammar.prototype.add_enumeration = function(name,values) {
    // console.log(" add_enumeration ",name,values);
    this._elements[name] = {
        type: "enumeration",
        enum: values
    };

    this._enumerations[name] =this._elements[name];

};
Grammar.prototype.add_entity = function(name,options) {
    var entity = {
        type: "entity",
        name: name
    };
    if (options.hasOwnProperty('properties')) {
        desc = options.properties;
        entity.properties = desc;
    }
    if (options.hasOwnProperty('abstract')) {
        abstract = options.abstract;
        entity.abstract = abstract;
    }
    // console.log(entity.name,"  ", JSON.stringify(entity,null," "))

    this._elements[name] = entity;
    this._entities[name] = entity;

};

var express_parser = require("./express_parser")

function parseSchema(input,callback) {


    var parser = require("./express_parser").parser;

    parser.yy.grammar = new Grammar();

    var success = parser.parse(input);
    // console.log(parser);
    if (!success)  {
        callback(new Error("Error !"),null)
    } else {
        //console.log(parser.yy.grammar);
        callback(null,parser.yy.grammar);
    }

}

function readSchema(filename,callback) {

    var source  = fs.readFileSync(filename,"utf8");
    parseSchema(source,callback);

}


exports.readSchema = readSchema;
exports.parseSchema = parseSchema;

