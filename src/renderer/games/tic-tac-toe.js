'use strict';
(function(root){
  function winner(board){for(const [a,b,c] of [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]])if(board[a]&&board[a]===board[b]&&board[a]===board[c])return board[a];return board.every(Boolean)?'draw':null;}
  function move(state,index){if(state.over||state.board[index])return state;const board=[...state.board];board[index]='X';let over=winner(board);if(!over){const available=board.map((v,i)=>v?null:i).filter((v)=>v!==null);if(available.length){const choice=available.find((i)=>{const copy=[...board];copy[i]='O';return winner(copy)==='O';})??available.find((i)=>{const copy=[...board];copy[i]='X';return winner(copy)==='X';})??available[Math.floor(Math.random()*available.length)];board[choice]='O';}over=winner(board);}return {board,over};}
  const api={winner,move};if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.TicTacToe=api;
})(typeof window!=='undefined'?window:globalThis);
