'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const llm = require('../src/main/llm');

test('a text-only selected model retries once with the provider vision model when image input is rejected', async () => {
  const previousFetch = global.fetch;
  const models = [];
  global.fetch = async (_url, request) => {
    const body = JSON.parse(request.body);
    models.push(body.model);
    if (models.length === 1) return new Response(JSON.stringify({ error: { message: 'This model does not support image input' } }), { status: 400 });
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Un dessin de chat.' } }] }), { status: 200 });
  };
  try {
    const answer = await llm.see('openai', { apiKeys: { openai: 'test-key' } }, { model: 'text-only-model', image: 'aW1hZ2U=', prompt: 'Describe it' });
    assert.equal(answer, 'Un dessin de chat.');
    assert.deepEqual(models, ['text-only-model', llm.VISION_MODELS.openai]);
  } finally {
    global.fetch = previousFetch;
  }
});

test('unrelated vision failures do not trigger another model request', async () => {
  const previousFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls++; return new Response(JSON.stringify({ error: { message: 'invalid API key' } }), { status: 401 }); };
  try {
    await assert.rejects(llm.see('openai', { apiKeys: { openai: 'bad-key' } }, { model: 'text-only-model', image: 'aW1hZ2U=', prompt: 'Describe it' }), /invalid API key/);
    assert.equal(calls, 1);
  } finally {
    global.fetch = previousFetch;
  }
});

test('a custom Vercel-style provider can discover and retry a listed vision model', async () => {
  const previousFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, request = {}) => {
    if (!request.method || request.method === 'GET') {
      calls.push('models');
      return new Response(JSON.stringify({ data: [{ id: 'text-chat' }, { id: 'qwen/qwen2.5-vl' }] }), { status: 200 });
    }
    const model = JSON.parse(request.body).model;
    calls.push(model);
    if (model === 'text-chat') return new Response(JSON.stringify({ error: { message: 'This model does not support image input' } }), { status: 400 });
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Un dessin de Capri.' } }] }), { status: 200 });
  };
  try {
    const answer = await llm.see('custom', { customUrl: 'https://capri.example/api/v1' }, { model: 'text-chat', image: 'aW1hZ2U=', prompt: 'Describe it' });
    assert.equal(answer, 'Un dessin de Capri.');
    assert.deepEqual(calls, ['text-chat', 'models', 'qwen/qwen2.5-vl']);
  } finally {
    global.fetch = previousFetch;
  }
});

test('Pollinations uses its current image-capability catalog and Gen endpoint instead of the text-only openai alias', async () => {
  const previousFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, request = {}) => {
    calls.push({ url, request });
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ data: [
        { id: 'openai/gpt-oss-20b', input_modalities: ['text'] },
        { id: 'google/gemini-3.7-flash', input_modalities: ['text', 'image'] },
      ] }), { status: 200 });
    }
    assert.match(url, /^https:\/\/gen\.pollinations\.ai\/v1\/chat\/completions$/);
    assert.equal(request.headers.authorization, 'Bearer free-test-key');
    assert.equal(JSON.parse(request.body).model, 'google/gemini-3.7-flash');
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Un dessin de Capri.' } }] }), { status: 200 });
  };
  try {
    const answer = await llm.see('pollinations', { apiKeys: { pollinations: 'free-test-key' } }, { image: 'aW1hZ2U=', prompt: 'Describe it' });
    assert.equal(answer, 'Un dessin de Capri.');
    assert.deepEqual(calls.map(({ url }) => url), [
      'https://gen.pollinations.ai/v1/models',
      'https://gen.pollinations.ai/v1/chat/completions',
    ]);
  } finally {
    global.fetch = previousFetch;
  }
});

test('Pollinations reports that image analysis needs a key without sending an unauthenticated request', async () => {
  const previousFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls++; throw new Error('unexpected network request'); };
  try {
    await assert.rejects(llm.see('pollinations', { apiKeys: {} }, { image: 'aW1hZ2U=', prompt: 'Describe it' }), { code: 'visionkey' });
    assert.equal(calls, 0);
  } finally {
    global.fetch = previousFetch;
  }
});

test('NVIDIA Build selects a free image model for vision while preserving an independently chosen provider', async () => {
  const previousFetch = global.fetch;
  let call;
  global.fetch = async (url, request) => {
    call = { url, request };
    return new Response(JSON.stringify({ choices: [{ message: { content: 'A hand-drawn cat.' } }] }), { status: 200 });
  };
  try {
    const answer = await llm.see('nvidia', {
      provider: 'pollinations',
      apiKeys: { nvidia: 'nvapi-test' },
    }, { image: 'aW1hZ2U=', prompt: 'Describe it', language: 'fr' });
    assert.equal(answer, 'A hand-drawn cat.');
    assert.equal(call.url, 'https://integrate.api.nvidia.com/v1/chat/completions');
    assert.equal(call.request.headers.authorization, 'Bearer nvapi-test');
    const body = JSON.parse(call.request.body);
    assert.equal(body.model, 'nvidia/nemotron-3.5-super-vl-120b-a12b');
    assert.equal(body.max_tokens, 1024);
    assert.deepEqual(body.chat_template_kwargs, { enable_thinking: false });
    assert.equal(body.temperature, 0.6);
    assert.equal(body.top_p, 0.95);
    assert.deepEqual(body.messages[0], {
      role: 'system',
      content: 'Language requirement: answer only in French. Do not switch to English or any other language, even if the image or model defaults suggest it. Output one short sentence and no translation.',
    });
    assert.deepEqual(llm.NVIDIA_FREE_VISION_MODELS, ['nvidia/nemotron-3.5-super-vl-120b-a12b']);
  } finally {
    global.fetch = previousFetch;
  }
});

test('an empty visible vision answer is reported as an error instead of being treated as a successful description', async () => {
  const previousFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: '', reasoning_content: 'hidden reasoning only' } }] }), { status: 200 });
  try {
    await assert.rejects(
      llm.see('nvidia', { apiKeys: { nvidia: 'nvapi-test' } }, { image: 'aW1hZ2U=', prompt: 'Que vois-tu ?' }),
      { code: 'emptyvision', message: 'Le modèle vision a terminé sans fournir de description.' },
    );
  } finally {
    global.fetch = previousFetch;
  }
});

test('a retired saved NVIDIA model is migrated and an unavailable current model is reported accurately', async () => {
  const previousFetch = global.fetch;
  const attempts = [];
  global.fetch = async (url, request) => {
    if (!request.method || request.method === 'GET') {
      return new Response(JSON.stringify({ data: [{ id: 'nvidia/nemotron-3.5-super-vl-120b-a12b' }] }), { status: 200 });
    }
    const model = JSON.parse(request.body).model;
    attempts.push({ url, model });
    return new Response('404 page not found\n', { status: 404 });
  };
  try {
    await assert.rejects(llm.see('nvidia', { apiKeys: { nvidia: 'nvapi-test' }, visionModel: 'meta/llama-3.2-90b-vision-instruct' }, {
      image: 'aW1hZ2U=', prompt: 'Describe it', model: 'meta/llama-3.2-90b-vision-instruct',
    }), (error) => error.code === 'gone' && /404 page not found/.test(error.message));
    assert.deepEqual(attempts, [{ url: 'https://integrate.api.nvidia.com/v1/chat/completions', model: 'nvidia/nemotron-3.5-super-vl-120b-a12b' }]);
  } finally {
    global.fetch = previousFetch;
  }
});
