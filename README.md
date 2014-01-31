# node-STEP

This is a series of nodejs script to analyse and explore STEP (ISO 10303) file format.

This projet provides a very basic EXPRESS grammar 
It focuses in exploring part assemblies inside STEP files as per AP 203.


[![Build Status](https://travis-ci.org/erossignon/node-STEP.png?branch=master)](https://travis-ci.org/erossignon/node-STEP)
[![Dependency Status](https://gemnasium.com/erossignon/node-STEP.png)](https://gemnasium.com/erossignon/node-STEP)

[![NPM](https://nodei.co/npm-dl/node-step.png)](https://nodei.co/npm/node-step/)
[![NPM](https://nodei.co/npm/node-step.png?downloads=true&stars=true)](https://nodei.co/npm/node-step/)

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
 ```


to explore an assembly :
 ```javascript
 var STEP = require("node-step");

 var reader = new STEP.StepReader();

 reader.read("parts/anchor.step",function(err) {
      if (err) {
        console.log("failure :" + err);
        return;
      }
      var product_definitions = reader.getObjects("PRODUCT_DEFINITION");
      reader.dumpStatistic();
 });
 ```

```text
assembly
├─┬ 20838 SDR:'Placement #0'
│ ├─┬ used_representation = 20837 SHAPE_REPRESENTATION
│ │ └─┬ MAPPED_ITEM:20816 ADVANCED_BREP_SHAPE_REPRESENTATION
│ │   ├── 20815 AXIS2_PLACEMENT_3D
│ │   └── 20803 MANIFOLD_SOLID_BREP
│ ├──  relating  = 'ANCORA_1550_ASM'
│ └──  related   = 'MARRA'
├─┬ 21168 SDR:'Placement #1'
│ ├─┬ used_representation = 21167 SHAPE_REPRESENTATION
│ │ └─┬ MAPPED_ITEM:21152 ADVANCED_BREP_SHAPE_REPRESENTATION
│ │   ├── 21151 AXIS2_PLACEMENT_3D
│ │   └── 21139 MANIFOLD_SOLID_BREP
│ ├──  relating  = 'ANCORA_1550_ASM'
│ └──  related   = 'PERNO_PER_MARRE'
├─┬ 24353 SDR:'Placement #2'
│ ├─┬ used_representation = 24352 SHAPE_REPRESENTATION
│ │ └─┬ MAPPED_ITEM:24336 ADVANCED_BREP_SHAPE_REPRESENTATION
│ │   ├── 24335 AXIS2_PLACEMENT_3D
│ │   ├── 21331 MANIFOLD_SOLID_BREP
│ │   └── 24323 MANIFOLD_SOLID_BREP
│ ├──  relating  = 'ANCORA_1550_ASM'
│ └──  related   = 'FUSO'
├─┬ 25287 SDR:'Placement #3'
│ ├─┬ used_representation = 25286 SHAPE_REPRESENTATION
│ │ └─┬ MAPPED_ITEM:25271 ADVANCED_BREP_SHAPE_REPRESENTATION
│ │   ├── 25270 AXIS2_PLACEMENT_3D
│ │   └── 25258 MANIFOLD_SOLID_BREP
│ ├──  relating  = 'ANCORA_1550_ASM'
│ └──  related   = 'CICALA_103'
├─┬ 20825 SDR:''
│ ├─┬ used_representation = 20816 ADVANCED_BREP_SHAPE_REPRESENTATION
│ │ ├── 20815 AXIS2_PLACEMENT_3D
│ │ └── 20803 MANIFOLD_SOLID_BREP
│ └── definition PD:20823 'MARRA'
├─┬ 20826 SDR:''
│ ├─┬ used_representation = 20828 SHAPE_REPRESENTATION
│ │ ├─┬ MAPPED_ITEM:20816 ADVANCED_BREP_SHAPE_REPRESENTATION
│ │ │ ├── 20815 AXIS2_PLACEMENT_3D
│ │ │ └── 20803 MANIFOLD_SOLID_BREP
│ │ ├─┬ MAPPED_ITEM:21152 ADVANCED_BREP_SHAPE_REPRESENTATION
│ │ │ ├── 21151 AXIS2_PLACEMENT_3D
│ │ │ └── 21139 MANIFOLD_SOLID_BREP
│ │ ├─┬ MAPPED_ITEM:24336 ADVANCED_BREP_SHAPE_REPRESENTATION
│ │ │ ├── 24335 AXIS2_PLACEMENT_3D
│ │ │ ├── 21331 MANIFOLD_SOLID_BREP
│ │ │ └── 24323 MANIFOLD_SOLID_BREP
│ │ ├─┬ MAPPED_ITEM:25271 ADVANCED_BREP_SHAPE_REPRESENTATION
│ │ │ ├── 25270 AXIS2_PLACEMENT_3D
│ │ │ └── 25258 MANIFOLD_SOLID_BREP
│ │ └── 25299 AXIS2_PLACEMENT_3D
│ └─┬ definition PD:25304 'ANCORA_1550_ASM'
│   └─┬ nauos
│     ├── 20823 'MARRA'
│     ├── 21156 'PERNO_PER_MARRE'
│     ├── 24341 'FUSO'
│     └── 25275 'CICALA_103'
├─┬ 21158 SDR:''
│ ├─┬ used_representation = 21152 ADVANCED_BREP_SHAPE_REPRESENTATION
│ │ ├── 21151 AXIS2_PLACEMENT_3D
│ │ └── 21139 MANIFOLD_SOLID_BREP
│ └── definition PD:21156 'PERNO_PER_MARRE'
├─┬ 24343 SDR:''
│ ├─┬ used_representation = 24336 ADVANCED_BREP_SHAPE_REPRESENTATION
│ │ ├── 24335 AXIS2_PLACEMENT_3D
│ │ ├── 21331 MANIFOLD_SOLID_BREP
│ │ └── 24323 MANIFOLD_SOLID_BREP
│ └── definition PD:24341 'FUSO'
└─┬ 25277 SDR:''
  ├─┬ used_representation = 25271 ADVANCED_BREP_SHAPE_REPRESENTATION
  │ ├── 25270 AXIS2_PLACEMENT_3D
  │ └── 25258 MANIFOLD_SOLID_BREP
  └── definition PD:25275 'CICALA_103'
```


see also : http://www.steptools.com/support/stdev_docs/express/ap203/walkasm.html

to generate the EXPRESS parser with jison

   $ node node_modules/jison/lib/cli.js express_parser.jison


see http://www.jsdai.net/download
