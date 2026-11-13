'use strict';
(function(root){
  function initial(random=Math.random){const board=Array(16).fill(0);spawn(board,random);spawn(board,random);return board;}
  function spawn(board,random=Math.random){const empty=board.map((v,i)=>v?null:i).filter((v)=>v!==null);if(!empty.length)return board;const i=empty[Math.floor(random()*empty.length)];board[i]=random()<0.9?2:4;return board;}
  function move(board,direction,random=Math.random){const next=[...board];for(let line=0;line<4;line++){const ids=Array.from({length:4},(_,i)=>direction==='left'||direction==='right'?line*4+i:i*4+line);if(direction==='right'||direction==='down')ids.reverse();const values=ids.map((i)=>next[i]).filter(Boolean);for(let i=0;i<values.length-1;i++)if(values[i]===values[i+1]){values[i]*=2;values.splice(i+1,1);}while(values.length<4)values.push(0);ids.forEach((id,i)=>next[id]=values[i]);}const changed=next.some((v,i)=>v!==board[i]);if(changed)spawn(next,random);return {board:next,changed};}
  const api={initial,spawn,move};if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.Game2048=api;
})(typeof window!=='undefined'?window:globalThis);
