const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('src/core/cwb-ai.js', 'utf8');
const calls = [];
const sandbox = {
  console,
  URL,
  location:{ protocol:'http:', hostname:'127.0.0.1', origin:'http://127.0.0.1:4173' },
  fetch:async (url, options) => {
    calls.push({ url, options });
    return { ok:true, json:async () => ({ choices:[{ message:{ content:'relay-ok' } }] }) };
  },
};
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename:'cwb-ai.js' });

(async () => {
  const ai = sandbox.CWBAI;
  const config = { key:'custom', baseUrl:'https://queqiao.online/v1', model:'gpt5.5' };
  const relayResult = await ai.sendChat(config, [{ role:'user', content:'hello' }], { apiKey:'secret-value', relayToken:'relay-token-test' });
  assert.equal(relayResult.text, 'relay-ok');
  assert.equal(calls[0].url, 'http://127.0.0.1:4173/api/ai/chat');
  assert.equal(calls[0].options.headers['content-type'], 'application/json');
  assert.equal(calls[0].options.headers['x-ai-relay-token'], 'relay-token-test');
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(JSON.parse(calls[0].options.body).apiKey, 'secret-value');
  assert.equal(JSON.parse(calls[0].options.body).url, 'https://queqiao.online/v1/chat/completions');

  await ai.sendChat(config, [{ role:'user', content:'direct' }], { apiKey:'secret-value', useRelay:false });
  assert.equal(calls[1].url, 'https://queqiao.online/v1/chat/completions');
  assert.equal(calls[1].options.headers.authorization, 'Bearer secret-value');
  assert.equal(calls[1].options.redirect, 'error');

  console.log('PASS cwb-ai-relay-runtime');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
