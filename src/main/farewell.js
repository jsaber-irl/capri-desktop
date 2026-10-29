'use strict';

function farewellCaption(userName) {
  const name = typeof userName === 'string' ? userName.trim() : '';
  if (!name || /^(?:null|undefined|unknown|user|utilisateur|your name)$/i.test(name)) return 'Bye bye';
  return `Bye bye ${name.slice(0, 40)}`;
}

function createFarewell({ sendCommand, quit, getUserName, setTimer = setTimeout, clearTimer = clearTimeout, timeout = 12000 }) {
  let started = false;
  let finished = false;
  let timer = null;
  const finish = () => {
    if (!started || finished) return false;
    finished = true;
    if (timer) clearTimer(timer);
    timer = null;
    quit();
    return true;
  };
  return {
    start() {
      if (started) return false;
      started = true;
      sendCommand('farewell', { caption: farewellCaption(getUserName()) });
      timer = setTimer(finish, timeout);
      timer?.unref?.();
      return true;
    },
    finish,
    get started() { return started; },
  };
}

module.exports = { createFarewell, farewellCaption };
