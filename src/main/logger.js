'use strict';

const DEV = process.argv.includes('--dev');
process.env.CAPRI_DEV_MODE = DEV ? '1' : '0';

function devLog(...args) {
  if (DEV) console.log(...args);
}

module.exports = { DEV, devLog };
