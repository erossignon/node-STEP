

require('colors');
var util = require("util");
var assert = require('assert');
var Table = require('easy-table');
var fs = require("fs");



// http://www.steptools.com/support/stdev_docs/express/ap203/html/index.html
var waiting_file_type = 1;
var waiting_section = 2; // HEADER; or DATA;
var in_header_section = 3;
var in_data_section = 4;
var parsing_complete = 5;

var pattern_ISO_10303_21 = /ISO-10303-21;/;
var pattern_HEADER = /HEADER;/;
var pattern_DATA = /DATA;/;
var pattern_ENDSEC = /ENDSEC;/;

// pattern for simple step line #123=TOTO(....)
var pattern_simple_line = /^(\w+)\s*(\(.*\))\s*;/;

var pattern_startLine = /\#([0-9]+)\s*=\s*(.*)/;  // something like # 123 = ...



/**
 * this class reads and loads a raw step file in  memory
 *
 * @param callback
 * @constructor
 */
var StepIndexer = function (callback) {

    "use strict";

    this.filename ="";
    this.lastLine = "";
    this.entries = { };
    this.types = {};
    this.typesRev = {};
    this.callback = callback;


    this.curLine = "";

    this.bad_STEP_file = false;

    this.status = waiting_file_type;

    this.header = []; // un parsed header

};

util.inherits(StepIndexer, require("stream"));

StepIndexer.prototype._getTypeIndex = function (strType) {
    "use strict";
    var me = this;
    var typeIndex;
    if (me.types.hasOwnProperty(strType)) {
        typeIndex = me.types[strType];
    } else {
        //typeIndex = { key: me.typeCounter++ , array: []};
        typeIndex = { key: strType, array: []};
        me.types[strType] = typeIndex;
        me.typesRev[typeIndex.key] = strType;
    }
    return typeIndex;
};

function trim(str) {
    "use strict";
    return str.replace(/^\s+/g, '').replace(/\s+$/g, '');
}



/**
 * _splitComplexLine processes a complex step line.
 * of the form
 *     IDENTIFIER(x,y,(x,y,e),y)IDENTIFIER2(1,2,#1232)....
 *
 * @param line
 * @returns {Array}
 * @private
 */
StepIndexer.prototype._splitComplexLine = function (line) {

    "use strict";

    var me = this;
    var array = [];
    var i = 1;
    var n = line.length - 2;
    var s;
    while (i < n) {
        s = i;

        // skip identifier
        while (line[i] !== '(' && i < n) {
            i++;
            if (i >= n) { break;}
        }

        var identifier = trim(line.substr(s, i - s));

        // find balanced closing )
        var parLevel = 1;
        s = i;
        i+=1;

        while ((line[i] !== ')') || parLevel !== 1) {
            if (line[i] === ')')  { parLevel--;}
            if (line[i] === '(')  { parLevel++;}
            i++;
            if (i >= n) { break; }
        }

        var content = line.substr(s, i - s + 1);
        i++;
        if (identifier !== '' && identifier !== ')' ) {
            var typeIndex = me._getTypeIndex(identifier);
            array.push({ type: typeIndex.key, raw_data: content});
        }
    }
    return array;
};


StepIndexer.prototype.write = function (data) {

    "use strict";

    var me = this;

    if (me.bad_STEP_file) {
        console.log("bad step");
        return;
    }

    var lines = (this.lastLine + data.toString()).split(/\r\n|\n/);

    this.lastLine = lines.splice(lines.length - 1)[0];

    var matches,line_m,num,typeIndex,entry,type;

    lines.forEach(function (line /*, index, array*/) {

        if (me.bad_STEP_file) {
            return;
        }

        if (me.status === waiting_file_type) {
            if (pattern_ISO_10303_21.test(line)) {
                me.status = waiting_section;
                return;
            } else {
                me.bad_STEP_file = true;
                // destroy the input stream
                return;
            }

        }

        if (me.status === waiting_section) {
            if (pattern_HEADER.test(line)) {
                me.status = in_header_section;
                return;
            } else if (pattern_DATA.test(line)) {
                me.status = in_data_section;
                return;
            }
        }

        if (me.status === in_header_section) {

            if (pattern_ENDSEC.test(line)) {
                me.status = waiting_section;
                return;
            }
            me.header.push(line);

        } else if (me.status === in_data_section) {

            if (pattern_ENDSEC.test(line)) {
                me.status = parsing_complete;
                return;
            }

            matches = pattern_startLine.exec(line);
            if (matches) {
                me.curNum = matches[1];
                me.curLine = matches[2];
            } else {
                me.curLine += line;
            }
            if (me.curLine[me.curLine.length - 1] === ';') {

                matches = pattern_simple_line.exec(me.curLine);

                if (matches) {
                    // we have identify a simple form step line
                    // example:
                    //     #1234=EDGE_LOOP('',(#234));
                    //
                    num       = me.curNum;
                    type      = matches[1];
                    line_m    = matches[2];

                    // keep track of this
                    typeIndex = me._getTypeIndex(type);
                    typeIndex.array.push(num);
                    assert(typeIndex.key === type);

                    entry     = {
                        _id: num,
                        type: typeIndex.key,
                        raw_data: line_m
                    };
                    me.entries[num] = entry;


                } else {
                    // this is probably a complex form step line
                    // example:
                    // #1307=(NAMED_UNIT(*)SI_UNIT($,.STERADIAN.)SOLID_ANGLE_UNIT());
                    //
                    num       = me.curNum;
                    entry     = {
                        _id: num,
                        types: me._splitComplexLine(me.curLine)
                    };

                    me.entries[num] = entry;

                    entry.types.forEach(function (element) {
                        var type = element.type;
                        var typeIndex = me._getTypeIndex(type);
                        typeIndex.array.push(num);
                    });
                }
            }
        }
    });
};

StepIndexer.prototype.end = function (data) {

    "use strict";

    assert(data === undefined);
    // console.log(" END with ", data);
    var me = this;
    if (me.status !== parsing_complete) {
        me.bad_STEP_file = true;
        me.callback(new Error("Invalid step file"));
    } else {
        me.callback();
    }
};


/**
 * return true if the file is a correct STEP file
 * a correct STEP file starts with
 *     ISO-10303-21;
 *     HEADER;
 *
 * @param filename
 * @param callback
 */
function check_STEP_file(filename, callback) {

    "use strict";

    // "ISO-10303-21;"
    // "HEADER;"
    var stream = fs.createReadStream(filename, "r");

    var fileData = "";
    stream.on('data', function (data) {
        fileData += data;

        // The next lines should be improved
        var lines = fileData.split("\n");

        if (lines.length >= 2) {

            stream.destroy();
            if (!pattern_ISO_10303_21.test(lines[0])) {
                my_callback(new Error("this file is not a STEP FILE : ISO_10303_21 missing"));
            } else {
                my_callback(null, lines[0]);
            }
        }
    });
    stream.on('error', function () {
        my_callback('Error', null);
    });

    stream.on('end', function () {
        my_callback('File end reached without finding line', null);
    });

    var callback_called = false;

    function my_callback(err, data) {
        if (!callback_called) {
            callback_called = true;
            callback(err, data);
        }
    }
}

function buildStepIndex(filename,callback) {


    "use strict";

    var input = fs.createReadStream(filename);

    var step_index = new StepIndexer(function (err) {

        input.destroy();

        step_index.write = undefined ; // function no longer required

        if (err) {
            callback(err);
            return;
        }
        callback(null,step_index);
    });
    step_index.filename = filename;
    input.pipe(step_index);

}

exports.StepIndexer     = StepIndexer;
exports.check_STEP_file = check_STEP_file;
exports.buildStepIndex  = buildStepIndex;
