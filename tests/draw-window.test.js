'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {validateDrawing,PNG_SIGNATURE}=require('../src/main/draw-window');
test('draw documents validate bounded normalized strokes and keep the versioned data shape',()=>{
  const result=validateDrawing({version:1,strokes:[{color:'#ff2e78',size:5,erase:false,points:[{x:0,y:0},{x:1,y:1}]}]});assert.equal(result.strokes.length,1);assert.ok(result.updatedAt);
  assert.deepEqual(validateDrawing({version:1,strokes:[{color:'#abcdef',size:4,points:[{x:.25,y:.75}],untrusted:'discard me'}]}).strokes[0],{color:'#abcdef',size:4,erase:false,points:[{x:.25,y:.75}]});
  assert.throws(()=>validateDrawing({version:1,strokes:[{color:'red',size:5,points:[]}]}),/Style/);
  assert.throws(()=>validateDrawing({version:1,strokes:[{color:'#ffffff',size:5,points:[{x:2,y:0}]}]}),/hors/);
});
test('PNG export validates the actual PNG signature',()=>assert.deepEqual([...PNG_SIGNATURE],[137,80,78,71,13,10,26,10]));
