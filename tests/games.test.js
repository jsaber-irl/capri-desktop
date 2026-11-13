'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const tic=require('../src/renderer/games/tic-tac-toe');const game2048=require('../src/renderer/games/2048');
test('tic-tac-toe rejects occupied and completed moves and Capri takes a legal response',()=>{
  let state={board:Array(9).fill(null),over:null};state=tic.move(state,0);assert.equal(state.board[0],'X');assert.equal(state.board.filter(Boolean).length,2);assert.equal(tic.move(state,0),state);
  assert.equal(tic.winner(['X','X','X',null,null,null,null,null,null]),'X');assert.equal(tic.winner(['X','O','X','X','O','O','O','X','X']),'draw');
});
test('2048 merges without chaining a newly merged tile and leaves unchanged boards alone',()=>{
  const board=[2,2,4,0,0,0,0,0,0,0,0,0,0,0,0,0];const result=game2048.move(board,'left',()=>0.99);
  assert.deepEqual(result.board.slice(0,4),[4,4,0,0]);assert.equal(result.changed,true);
  assert.equal(game2048.move(Array(16).fill(0),'left').changed,false);
});
test('Gaming Mode quiet tick cancels autonomous activity and skips its normal work',async()=>{
  global.matchMedia ||= (()=>({matches:false,addEventListener(){}}));
  const {Life}=await import('../src/renderer/js/life.js');let stopped=0,cancelled=0;
  Life.prototype.tick.call({paused:false,quietMode:true,run:{},cancel(){cancelled++;this.run=null;},stopPhones(){stopped++;},music(){throw Error('should not tick music')},free(){throw Error('should not check activity')} });
  assert.equal(cancelled,1);assert.equal(stopped,1);
});
