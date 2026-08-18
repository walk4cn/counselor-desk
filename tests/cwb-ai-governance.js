const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('src/core/cwb-ai.js', 'utf8');
const sandbox = { console, URL, setTimeout, clearTimeout };
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename:'cwb-ai.js' });

const ai = sandbox.CWBAI;
assert.ok(ai, 'CWBAI should be exposed');
assert.equal(JSON.stringify(ai.providerCatalog().map(item => item.key)), JSON.stringify([
  'openai', 'deepseek', 'gemini', 'claude', 'qwen', 'zhipu', 'doubao', 'kimi',
]));

const redacted = ai.redact({
  name:'张三', student_number:'20240001', phone:'13812345678',
  reason:'心理预警，需要联系家长', note:'家长电话 13900000000', score:92,
});
assert.equal(redacted.name, '[已脱敏]');
assert.equal(redacted.student_number, '[已脱敏]');
assert.equal(redacted.phone, '[已脱敏]');
assert.equal(redacted.reason, '[已脱敏]');
assert.equal(redacted.score, 92);
assert.match(redacted.note, /\[已脱敏\]/);

const context = ai.buildContext({
  purpose:'weekly_summary', includeSensitive:false,
  records:[{ type:'task', title:'班会', student_number:'20240001', summary:'完成' }],
});
assert.equal(context.purpose, 'weekly_summary');
assert.equal(context.records[0].student_number, '[已脱敏]');
assert.equal(context.records[0].title, '班会');
assert.equal(context.sensitive, false);

assert.throws(() => ai.validateProviderConfig({ key:'custom', baseUrl:'not-url' }), /AI_PROVIDER_BASE_URL_INVALID/);
assert.throws(() => ai.normalizeProviderConfig({ key:'custom', baseUrl:'http://example.test/v1', model:'demo' }), /AI_PROVIDER_BASE_URL_INVALID/);
const config = ai.normalizeProviderConfig({ key:'custom', name:'本地模型', baseUrl:'https://example.test/v1/', model:'demo' });
assert.equal(config.baseUrl, 'https://example.test/v1');
assert.equal(config.relayUrl, '');
assert.equal(config.model, 'demo');
assert.equal(config.supportsVision, false);
assert.equal(JSON.stringify(config.allowedPurposes), '[]');

const governedConfig = ai.normalizeProviderConfig({
  key:'custom', name:'视觉模型', baseUrl:'https://example.test/v1', relayUrl:'https://relay.example.test/api/ai/chat', model:'vision-demo', supportsVision:true,
  allowedPurposes:['work_summary', 'unknown_task', 'certificate_recognition'],
});
assert.equal(governedConfig.supportsVision, true);
assert.equal(governedConfig.relayUrl, 'https://relay.example.test/api/ai/chat');
assert.equal(JSON.stringify(governedConfig.allowedPurposes), JSON.stringify(['work_summary', 'certificate_recognition']));

const request = ai.buildChatRequest(config, [{ role:'user', content:'你好' }]);
assert.equal(request.url, 'https://example.test/v1/chat/completions');
assert.equal(request.body.model, 'demo');
assert.equal(request.body.messages[0].content, '你好');
assert.equal(ai.normalizeRelayUrl('/api/ai/chat'), '/api/ai/chat');
assert.throws(() => ai.normalizeRelayUrl('http://relay.example.test/api/ai/chat'), /AI_PROVIDER_RELAY_URL_INVALID/);
sandbox.location = { protocol:'http:', hostname:'127.0.0.1', origin:'http://127.0.0.1:4173' };
assert.equal(ai.resolveRelayUrl(config), 'http://127.0.0.1:4173/api/ai/chat');
assert.equal(ai.resolveRelayUrl({ baseUrl:'http://127.0.0.1:11434/v1' }), '');

const vision = ai.buildVisionMessage('识别证书字段', 'data:image/png;base64,abc');
assert.equal(vision.role, 'user');
assert.equal(vision.content[0].type, 'text');
assert.equal(vision.content[1].type, 'image_url');
assert.equal(vision.content[1].image_url.url, 'data:image/png;base64,abc');

assert.equal(ai.extractResponseText({ choices:[{ message:{ content:'结果' } }] }), '结果');
assert.equal(ai.extractResponseText({ candidates:[{ content:{ parts:[{ text:'候选结果' }] } }] }), '候选结果');

console.log('PASS cwb-ai-governance');
