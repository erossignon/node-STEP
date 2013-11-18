/**
 *  ExpressParser :
 *
 *  Author : Etienne Rossignon ( etienne.rossignon@gadz.org )
 */

var assert = require('assert');
require('colors');


function ExpressParser(grammar,resolve_entity_Functor)
{
    "use strict";

    var me = this;

    this.grammar = grammar;

    this.resolve_entity_id = resolve_entity_Functor;

    if (this.resolve_entity_id === undefined ) {
        this.resolve_entity_id = function(entity_id)  {
            return me.resolve_entity(entity_id);
        };
    }
    this.already_displayed_messages= {};

}

ExpressParser.prototype.resolve_entity = function(entity_id) {
    // by default does nothing
    "use strict";
    return entity_id;
};


ExpressParser.prototype.parseSimpleStepLine = function(entityName,raw_data,obj) {

    "use strict";
    var me = this;
    entityName = entityName.toLowerCase();
    if ( ! me.grammar.entities.hasOwnProperty(entityName) ) {
        // if (verbose) {
        var msg =" Error !!! cannot get parser for "+entityName;
        if (! me.already_displayed_messages.hasOwnProperty(msg) ) {
            me.debugLog(msg.red);
            me.already_displayed_messages[msg]= msg;
        }
    } else {
        var parser = this.grammar.getSingleLineParser(entityName);
        assert( parser !== undefined, " cannot find parser for " +entityName );
        assert(parser !== undefined);
        me._parseType(obj, raw_data, parser);
    }

};

ExpressParser.prototype.parseComplexStepLine = function(entityTypes,obj) {

    "use strict";

    assert(entityTypes instanceof Array, " in parseComplexStepLine : entityTypes should be an array");
    assert(entityTypes[0].hasOwnProperty('type'),     " in parseComplexStepLine : invalid entityTypes");
    assert(entityTypes[0].hasOwnProperty('raw_data'), " in parseComplexStepLine : invalid entityTypes");

    var me = this;

    // let parse each segment
    entityTypes.forEach(function (etype) {

        // just
        var className = etype.type.toLowerCase();
        if ( ! me.grammar.entities.hasOwnProperty(className) ) {
            me.debugLog(" Error !!! cannot get parser for ".yellow, className);
        } else {
            var parser = me.grammar.getPartialLineParser(className);
            me._parseType(obj, etype.raw_data,parser);
        }
    });

};

var verbose = false;
ExpressParser.prototype.debugLog = function(message) {

    "use strict";
    console.log(("file " + this.filename).yellow.bold);
    console.log.apply(console,arguments);
};

ExpressParser.prototype._parseType = function (obj, raw_data, parser) {


    "use strict";
    assert( parser !== undefined, "expecting valid parser in _parseType with "+ raw_data);

    var entityName = parser.name;
    var pattern = parser.pattern;
    var simplePattern = parser.simplePattern;

    if (verbose) {
        console.log(entityName," #", obj._id, "  parsing ".cyan, simplePattern,pattern, ' on line ', raw_data);
    }
    var me = this;
    var matches = pattern.exec(raw_data);

    if (!matches) {
        me.debugLog("#", obj._id, entityName, " cannot parse ".red, simplePattern,pattern, ' on line ', raw_data);
        return {};
    }
    if (matches.length - 1 !== parser.props.length) {
        console.log(" warning : number element found ".green + matches.length + " instead of "+parser.props.length);
        console.log(" parsing ", (simplePattern + "").red);
        console.log(" parsing ", (pattern + "").red);
        console.log(" on line ", raw_data.cyan);
        console.log(matches);
    }

    if (obj._class) {
        if ( ! (obj instanceof Array)) {
            var tmp = obj._class;
            obj._class = [ tmp ];
        }
        obj._class.push(entityName.toUpperCase());
    } else {
        obj._class = entityName.toUpperCase();
    }

    for (var i = 0; i < matches.length - 1; i++) {

        var property = parser.props[i];

        var value = matches[i + 1];

        if (property.type === '[#]') {

            // parse the array of ids

            var array_of_ids = [];
            var r = /#([0-9]+),{0,1}/g;

            var m;
            while ( (m = r.exec(value)) !== null ) {
                array_of_ids.push(m[1]);
            }
            value = array_of_ids;
        }
        // add a property to the object with the specified value
        obj[property.name] = value;

        // if the property is a pointer to an other entity
        // or a array of pointer, let recursively
        // resolve ids to objects
        if (property.class !== undefined &&
            (property.type ===  '#' || property.type === '[#]') ) {
            if (value!=="*")    {
                //xx if (parsers[property.class]) {
                // a parser exists,
                if (value instanceof Array) {
                    obj[property.name] = value.map(me.resolve_entity_id) ;
                } else {
                    obj[property.name] = me.resolve_entity_id(value);
                }
            }
            //xx } else {
            //xx     if (property.type === '@') {
            //xx         // enum
            //xx         obj[property.name] = value;
            //xx
            //xx     } else  if ( -1 === [ "LABEL","TEXT","IDENTIFIER","BOOLEAN","LOGICAL"].indexOf(property.class) ) {
            //xx
            //xx         if (verbose) {
            //xx             console.log(" No parser to resolve property ".yellow,property.name ,
            //xx                 "#",value, " into ".yellow, property.type,property.class);
            //xx         }
            //xx
            //xx     }
            //xx }
        }
    }
    return obj;
};


exports.ExpressParser = ExpressParser;

