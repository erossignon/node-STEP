


var StepIndexer = function () {
  this.readable = true;
  this.writable = true;
  this.lastLine = ""
  this.lines = { };
  this.lastEntry = {};
  this.types = {};
  this.typesRev = {};
  this.typeCounter = 1;

};
require("util").inherits(StepIndexer, require("stream"));


StepIndexer.prototype.write = function (data) {
  var me = this;
  var lines = (this.lastLine + data.toString()).split(/\r\n|\n/);
  // console.log(" line ,",lines.length);
  this.lastLine = lines.splice(lines.length-2)[0]

  var matches;
     var patterns = /\#([0-9]+)\s*=\s*(\w+)/
     lines.forEach(function(line,inde,array){
     matches = patterns.exec(line);
     if (matches) {
       // console.log(matches);
	var num  = matches[1];
	var type = matches[2];
	var typeIndex ;
	if ( me.types.hasOwnProperty(type)) {
	    typeIndex =  me.types[type];
	} else {
	    typeIndex = { key: me.typeCounter++ , array: []};
	    me.types[type]=typeIndex;
	    me.typesRev[typeIndex.key] = type;
	}
	var entry = { id: num, type: typeIndex.key, line: line};
	me.lines[num] = entry;
	typeIndex.array.push(num);
	me.lastEntry = entry;
     }  else { 
	me.lastEntry.line += line;
	//console.log(me.lastEntry.line);
     }
  });
  // console.log(" DATA ");
  // this..apply(this, arguments);
};

function buildRegExp(t) {
   var s = ".*\\(\\s*";
   // BOOLEAN
   t = t.replace(/B/g,"(\.T\.|\.F\.)");	   
   // STRING
   t = t.replace(/S/g,"'([^']*)'");	   
   // Set of #
   t = t.replace(/\[#\]/g,"%");
   // ENTITY (#123]
   t = t.replace(/#/g,"#([0-9]+)");	   
   t = t.replace(/E/g,"#([0-9]+)");	   
   // ,
   t = t.replace(/,/g,"\\s*,\\s*");	   
   // SET of # 
   t = t.replace(/%/g,"\\(\([0-9\\#\\,]+\)\\)");	   
   // enum
   t = t.replace(/@/g,"\\.[A-Za-z_]+\\.");
   s += t;
   s += ".*\\s*\\)";
   return new RegExp(s);
}

parsers = {}
function registerParser(name,inherit_from,props) {
  var s = "";
  props.forEach(function (p) { 
    s += "," + p.type; 
  })
  var simplePattern = s.slice(1);
  var pattern = buildRegExp(simplePattern);
  console.log(" name = ",name, simplePattern);
  parsers[name] = {
	 pattern: pattern,
	 props: props,
	 name:  name,
 }
}
registerParser('PRODUCT_DEFINITION', "", 
[ 
	   {  name: 'name'               , type: 'S' },
           {  name: 'description'        , type: 'S' },
	   {  name: 'formation'          , type: 'E' , class: 'PRODUCT_DEFINITION_FORMATION' },
	   {  name: 'frame_of_reference' , type: 'E' , class: 'PRODUCT_DEFINITION_CONTEXT'  }
]);
registerParser('PRODUCT_DEFINITION_FORMATION',"", 
[ 
	   {  name: 'name'               , type: 'S' },
           {  name: 'description'        , type: 'S' },
	   {  name: 'of_product'         , type: '#' , class: 'PRODUCT' }
]);
registerParser('PRODUCT_DEFINITION_FORMATION_WITH_SPECIFIED_SOURCE','PRODUCT_DEFINITION_FORMATION',
[
	   {  name: 'name'               , type: 'S' },
           {  name: 'description'        , type: 'S' },
	   {  name: 'of_product'         , type: '#' , class: 'PRODUCT' },
	   {  name: 'make_or_buy'        , type: '@' , class: 'SOURCE' }
]);
function registerEnum()
{
}
registerEnum('SOURCE',["MADE","BOUGHT","NOT_KNOWN"]);

registerParser('PRODUCT_DEFINITION_CONTEXT', "",
[
	   {  name: 'name'               , type: 'S' },
           {  name: 'frame_of_reference' , type: 'E' , class: 'APPLICATION_CONTEXT' },
	   {  name: 'life_cycle_stage'   , type: 'E' , class: 'ANY' }
]);
registerParser('PRODUCT', "",
[ 
	   {  name: 'name'               , type: 'S' },
           {  name: 'description'        , type: 'S' },
           {  name: 'description'        , type: 'S' },
	   {  name: 'frame_of_reference' , type: '[#]', class: 'PRODUCT_CONTEXT' }
]);
registerParser('SHAPE_DEFINITION_REPRESENTATION', "",
[
	{ name: "definition"            , type: '#' /* SELECT */ },
	{ name: "used_representation"   , type: '#' /* ENTITY */ },

]);
registerParser('NEXT_ASSEMBLY_USAGE_OCCURENCE', "",
[
]);
registerParser('MAPPED_ITEM', "",
[

]);
registerParser('GEOMETRIC_REPRESENTATION_ITEM','REPRESENTATION_ITEM',[]);
registerParser('SOLID_MODEL','GEOMETRIC_REPRESENTATION_ITEM',[]);

registerParser('MANIFOLD_SOLID_BREP',"SOLID_MODEL",
[
	{  name: 'name'               , type: 'S' },
	{  name: 'outer'              , type: 'E' , class: "CLOSED_SHELL" },
]);

registerParser('BREP_WITH_VOIDS','MANIFOLD_SOLID_BREP', [ 
]);

registerParser("CLOSED_SHELL","CONNECTED_FACE_SET",
[
	{  name: 'name'               , type: 'S' },
	{  name: 'cfs_faces'          , type: '[#]' , class: "FACE" },
]);

registerParser("REPRESENTATION_ITEM","",[]);

registerParser("TOPOLOGICAL_REPRESENTATION_ITEM","REPRESENTATION_ITEM",[]);

registerParser("FACE","TOPOLOGICAL_REPRESENTATION_ITEM",
[
	{ name: 'name'		      , type: 'S' },
	{ name: 'bounds'	      , type: '[#]', class: "FACE_BOUND" }, 
]);
registerParser("ADVANCED_FACE","FACE_SURFACE",
[
	{ name: 'name'		      , type: 'S' },
	{ name: 'bounds'	      , type: '[#]', class: "FACE_BOUND" }, 
	{ name: 'face_geometry'       , type: '#',  class: 'SURFACE' },
	{ name: 'same_sense'          , type: 'B' }
]);


registerParser("FACE_BOUND","TOPOLOGICAL_REPRESENTATION_ITEM",
[
	{ name: 'name'		      , type: 'S' },
	{ name: 'bound'	              , type: '#', class: "LOOP" }, 
	{ name: 'orientation'         , type: 'B' },
]);
registerParser("FACE_OUTER_BOUND","FACE_BOUND",[]);

registerParser("LOOP", "TOPOLOGICAL_REPRESENTATION_ITEM", [ ]);
registerParser("EDGE_LOOP", "TOPOLOGICAL_REPRESENTATION_ITEM", 
[
	{ name: 'name'		      , type: 'S' },
	{ name: 'edge_list'	      , type: '[#]', class: "ORIENTED_EDGE" }, 
]);

registerParser("SURFACE","GEOMETRIC_REPRESENTATION_ITEM", []);




StepIndexer.prototype.parse = function(entity,parser) {
    if ( entity.object  ) {
	    console.log( "######################################################### already processed ," , entity.id);
	    return entity.object;
    }
    var me = this;
    var matches = parser.pattern.exec(entity.line);
    if (!matches) {
       console.log(" cannot parse ",parser.pattern, ' on line ', entity.line);
       return;
    }
    if (matches.length-1 != parser.props.length) {
	console.log(" warning : not enough element found in ");
    	console.log(" parsing ",parser.pattern, ' on line ', entity.line);
    	console.log(matches);
    }

    var obj = {}
    obj._class = parser.name;
    for (i=0;i<matches.length-1;i++) {
	var p = parser.props[i];
	var value = matches[i+1];
	if (p.type === '[#]') {

	   var set = [];
	   var r = /#([0-9]+),{0,1}/g

           while(m = r.exec(value)) {
	      set.push(m[1]);
	   }	  
	    
	   // console.log(' ------- SET = ', set.slice(0,10), "...");
	   // console.log(' -------------------------------------',p.name,p.type," value = ",value);
	   // console.log(p.name,p.type," value = ",value);
	   value = set;
	}
        obj[p.name] = value;
        if (p.class  && parsers[p.class]) {
		var baseType = p.class;
                function process(v) {
		   var subline = me.lines[v];
		   console.log("v=",v,subline);
		   var subtype = me.typesRev[subline.type];
		   console.log("subtype =", subtype);
		   if ( parsers[subtype] ) {
  	                return  me.parse(subline,parsers[subtype]);
		   } else {
		        console.log(" Undefined parser for type ",subtype);
		        return v;
	           }
		}
		if (value instanceof Array) {
		   obj[p.name] = value.map(function(v) { return process(v); });
		} else {
	           obj[p.name] = process(value);
		}
	}	
    }
    obj.id = entity.id;
    entity.object = obj;
    entity.line = null;
    // console.log(JSON.stringify(entity));
    return obj;
};


StepIndexer.prototype.end = function(data) {
   var me  = this;
// this.write(data);
   console.log(me.types['PRODUCT_DEFINITION']);
   var product_definitions = me.types['PRODUCT_DEFINITION'].array;
   product_definitions.forEach(function( num ) {
	var product_definition = me.parse(me.lines[num],parsers['PRODUCT_DEFINITION']);
	console.log(require('util').inspect(me.lines[num],{depth:4, colors:true}));
   });
 
   var breps1 = me.types['MANIFOLD_SOLID_BREP'];
   var breps2 = me.types['BREP_WITH_VOIDS'];
   console.log(" BREP_WITH_VOIDS = ", breps1);
   breps1.array.forEach(function(num) {
	   var tt = me.typesRev[me.lines[num].type]
     console.log(tt);
     var brep = me.parse(me.lines[num],parsers[tt]);
     console.log(require('util').inspect(me.lines[num],{depth:8, colors:true}));
   });

   
	
};

var fs = require("fs");

function readStep(filename) {
   
   var input = fs.createReadStream(filename);
   var detectLines = new StepIndexer();
   input.pipe(detectLines);
   return detectLines
}

var s = readStep("parts/anchor.step",function callback() {
	console.log(" Done");
});

exports.toto= readStep
