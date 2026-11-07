'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { findRivalTitle } = require('../src/main/ai-title');

test('matches known AI names in visible window titles without returning unrelated titles', () => {
  assert.deepEqual(findRivalTitle([
    { id: 'editor', app: 'Code', title: 'Untitled — Visual Studio Code' },
    { id: 'browser', app: 'Safari', title: 'ChatGPT — New chat' },
  ]), { key: 'chatgpt', title: 'ChatGPT — New chat', id: 'browser' });
  assert.deepEqual(findRivalTitle([{ id: 'browser', app: 'Google Chrome', title: 'Chat - Claude | Anthropic' }]), {
    key: 'claude',
    title: 'Chat - Claude | Anthropic',
    id: 'browser',
  });
  assert.deepEqual(findRivalTitle([{ id: 'app', app: 'ChatGPT', title: 'ChatGPT' }]), {
    key: 'chatgpt',
    title: 'ChatGPT',
    id: 'app',
  });
  assert.deepEqual(findRivalTitle([{ id: 'app', app: 'com.openai.chatgpt', title: 'New chat' }]), {
    key: 'chatgpt',
    title: 'New chat',
    id: 'app',
  });
  assert.equal(findRivalTitle([{ app: 'Notes', title: 'ChatGPT — Notes' }]), null);
  assert.equal(findRivalTitle([{ app: 'Safari', title: 'ChatGPT is down — YouTube' }]), null);
  assert.equal(findRivalTitle([{ app: 'Safari', title: 'YouTube — Music' }]), null);
});

test('parses Linux X11 window titles and application classes from wmctrl output', () => {
  const { parseLinuxWindows } = require('../src/main/ai-title');
  assert.deepEqual(parseLinuxWindows(
    '0x03e00007  0 12345 0 0 1280 800 google-chrome.Google-chrome workstation ChatGPT - New chat\n',
  ), [{
    id: '0x03e00007',
    app: 'google-chrome.Google-chrome',
    title: 'ChatGPT - New chat',
  }]);
  assert.deepEqual(parseLinuxWindows('not a wmctrl row'), []);
});
