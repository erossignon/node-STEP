var fs = require('fs');
var assert =require('assert');


var Grammar = function() {

    this._elements={};
    this._enumerations ={};
    this._entities = {};
    this._types = {};
    this._selects = {};

    var self = this;
    Object.defineProperty(this,"enumerations",{
        get: function() { return self._enumerations; },
        set: function(value) {
           throw new Error("cannot set enumeration")
        }
    });
    Object.defineProperty(this,"entities",{
        get: function() { return self._entities; },
        set: function(value) {
            throw new Error("cannot set entities")
        }
    });
};
Grammar.prototype.add_type = function(name,type) {
    this._elements[name] = {
        type: "type",
        name: name,
        type_type: type
    };
    this._types[name] =this._elements[name];

};
Grammar.prototype.add_select = function(name,values) {

    var element = {
        type: "select",
        name: name,
        list: values
    };
    this._elements[name] = element;
    this._selects[name] = element;

};

Grammar.prototype.add_enumeration = function(name,values) {
    // console.log(" add_enumeration ",name,values);
    this._elements[name] = {
        type: "enumeration",
        name: name,
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
        props = options.properties;
        entity.properties = props;
    }
    if (options.hasOwnProperty('abstract')) {
        abstract = options.abstract;
        entity.abstract = abstract;
    }
    //xx console.log(entity.name,"  ", JSON.stringify(entity,null," "))

    this._elements[name] = entity;
    this._entities[name] = entity;

};

//Grammar.prototype.buildParsingEngineElement = function(entityName) {
//
//    var props = buildProp(entityName);
//    var tmp =require("readStep.js");
//    tmp.registerEntityParser(entityName,"<unused>",props);
//};
Grammar.prototype.buildSelectList = function(selectName) {

    selectName  = selectName.toLowerCase();

    var element = this._selects[selectName];
    if ( element == null) {
        console.log(" ERROR / buildSelectList : cannot find entity with name ",selectName);
    }
    assert(element.type == "select");
    assert(element.hasOwnProperty("name"));
    assert(element.hasOwnProperty("list"));

    var l = [];
    for(a in element) {
        l.push(a.toUpperCase());
    }
    return l;

};

Grammar.prototype.buildProp = function(entityName) {

    entityName  = entityName.toLowerCase();

    var self = this;

    var e = this.entities[entityName];
    if ( e == null) {
        console.log(" ERROR / buildProp : cannot find entity with name ",entityName);
    }
    props = [];

    // build from SUBTYPE
    if (e.abstract != null) {
        //xx console.log('e=',e);
        e.abstract.forEach(function(a){
            if (a.abstract === "SUBTYPE_OF" ) {
                a.list_id.forEach(function(b) {
                    props_based =  self.buildProp(b);
                    props.concat(props_based);
                });
            }
        });
    }
    var self = this;
    //

    function _get_class(composite_type) {
        if (typeof composite_type === "object") {
            return _get_class(composite_type.composite_type);
        }
        return composite_type.toUpperCase();

    }
    function _get_type(composite_type) {

        if (typeof composite_type === "object") {
            var r = _get_type(composite_type.composite_type);
            // xx console.log("r=",r," composite_type=",composite_type);
            assert(r.length == 1);
            if (composite_type.type === 'SET_RANGE_OF') {
                return "[" + r + "]";
            }
            // xx console.log("composite_type=",composite_type);
            return "[" + r + "]";
            // assert(false);
        }
        name = composite_type;
        if (name in self._types) {
            // console.log(" totot ",name)
            return _get_type(self._types[name].type_type);
        }
        if (name in self._selects) {
            return "#";
        }
        if (name in self.enumerations ) {
            return "@";
        }
        if (name in self.entities ) {
            return "#";
        }
        if (name === "REAL") {
            return "f";
        }
        if (name === "INTEGER") {
            return "i";
        }
        if (name === "NUMBER") {
            return "f";
        }
        if (name === "STRING") {
            return "S";
        }
        if (name === "LOGICAL") {
            return "B";
        }
        if (name === "BOOLEAN") {
            return "B";
        }
        console.log(" ERRROR => p",name);
        assert(false,"cannot find "+name + " in entities or enumerations");
    }
    //console.log(e);

    e.properties.forEach(function(p){
        props.push( {
            name: p.identifier,
            type: _get_type(p.composite_type),
            class: _get_class(p.composite_type)
        })
    });

    return props;
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

