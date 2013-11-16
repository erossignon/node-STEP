var fs = require('fs');
var assert = require('assert');


var Grammar = function () {

    "use strict";

    this._elements = {};

    this._enumerations = {};
    this._entities = {};
    this._types = {};
    this._selects = {};

    var self = this;

    Object.defineProperty(this, "enumerations", {
        get: function () {
            return self._enumerations;
        },
        set: function (/*value*/) {
            throw new Error("cannot set enumeration");
        }
    });

    Object.defineProperty(this, "entities", {
        get: function () {
            return self._entities;
        },
        set: function (/*value*/) {
            throw new Error("cannot set entities");
        }
    });
};

Grammar.prototype.add_type = function (name, type) {

    "use strict";

    var item = {
        type: "type",
        name: name,
        type_type: type
    };
    this._types[name] = item;
    this._elements[name] = item;

};
Grammar.prototype.add_select = function (name, values) {

    "use strict";

    var item = {
        type: "select",
        name: name,
        list: values
    };
    this._selects[name] = item;
    this._elements[name] = item;
};

Grammar.prototype.add_enumeration = function (name, values) {

    "use strict";

    var item = {
        type: "enumeration",
        name: name,
        enum: values
    };

    this._enumerations[name] = item;
    this._elements[name] = item;
};

Grammar.prototype.add_entity = function (name, options) {

    "use strict";

    var item = {
        type: "entity",
        name: name
    };

    if (options.hasOwnProperty('properties')) {
        item.properties = options.properties;
    }

    if (options.hasOwnProperty('abstract')) {
        item.abstract = options.abstract;
    }

    this._elements[name] = item;
    this._entities[name] = item;
};


Grammar.prototype.buildSelectList = function (selectName) {

    "use strict";

    selectName = selectName.toLowerCase();

    var select_element = this._selects[selectName];

    if (select_element === null) {
        console.log(" ERROR / buildSelectList : cannot find entity with name ", selectName);
    }

    assert(select_element.type === "select");
    assert(select_element.hasOwnProperty("name"));
    assert(select_element.hasOwnProperty("list"));

    var l = [];
    for (var a in select_element) {
        if (select_element.hasOwnProperty(a)) {
            l.push(a.toUpperCase());
        }
    }
    return l;

};

Grammar.prototype.buildProp = function (entityName) {

    "use strict";

    var self = this;

    entityName = entityName.toLowerCase();

    var entity = this.entities[entityName];
    if (entity === null) {
        console.log(" ERROR / buildProp : cannot find entity with name ", entityName);
    }
    var props = [];

    // build from SUBTYPE
    if ( entity.abstract !== undefined) {
        // console.log('entity Name = ', entityName," => ",entity);
        entity.abstract.forEach(function (a) {
            if (a.abstract === "SUBTYPE_OF") {
                a.list_id.forEach(function (superTypeName) {
                    var props_based = self.buildProp(superTypeName);
                    props = props.concat(props_based);
                });
            }
        });
    }
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
            // console.log("r=",r," composite_type=",composite_type);
            if (composite_type.type === 'SET_RANGE_OF') {
                if (r.length === 1) {
                    return "[" + r + "]";
                } else {
                    return r;
                }
            }
            // xx console.log("composite_type=",composite_type);
            return "[" + r + "]";
            // assert(false);
        }
        if (composite_type in self._types) {
            return _get_type(self._types[composite_type].type_type);
        }
        if (composite_type in self._selects) {
            return "#";
        }
        if (composite_type in self.enumerations) {
            return "@";
        }
        if (composite_type in self.entities) {
            return "#";
        }
        if (composite_type === "REAL") {
            return "f";
        }
        if (composite_type === "INTEGER") {
            return "i";
        }
        if (composite_type === "NUMBER") {
            return "f";
        }
        if (composite_type === "STRING") {
            return "S";
        }
        if (composite_type === "LOGICAL") {
            return "B";
        }
        if (composite_type === "BOOLEAN") {
            return "B";
        }
        console.log(" ERROR => p", composite_type);
        assert(false, "cannot find " + composite_type + " in entities or enumerations");
        return "?";
    }

    entity.properties.forEach(function (property) {
        props.push({
            name: property.identifier,
            type: _get_type(property.composite_type),
            class: _get_class(property.composite_type)
        });
    });

    return props;
};



function parseSchema(input, callback) {

    "use strict";

    var parser = require("./express_parser").parser;

    parser.yy.grammar = new Grammar();

    var success = parser.parse(input);
    // console.log(parser);
    if (!success) {
        callback(new Error("Error !"), null);
    } else {
        //console.log(parser.yy.grammar);
        callback(null, parser.yy.grammar);
    }
}

function readSchema(filename, callback) {

    "use strict";

    var source = fs.readFileSync(filename, "utf8");
    parseSchema(source, callback);

}


exports.readSchema = readSchema;
exports.parseSchema = parseSchema;

