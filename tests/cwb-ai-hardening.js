const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('src/core/cwb-ai.js', 'utf8');
const workflow = fs.readFileSync('src/core/cwb-ai-workflow.js', 'utf8');

const workflowSandbox = { console, URL, setTimeout, clearTimeout, AbortController };
workflowSandbox.globalThis = workflowSandbox;
vm.runInNewContext(workflow, workflowSandbox, { filename:'cwb-ai-hardening-workflow.js' });
const aiWorkflow = workflowSandbox.CWBAIWorkflow;

const verified = aiWorkflow.normalizeSource({ kind:'web', url:'https://example.com/policy', status:'available' });
assert.equal(aiWorkflow.sourceUsable(verified), true);
assert.equal(aiWorkflow.sourceUsable({ kind:'web', url:'http://example.com/policy', status:'available', verification_status:'verified' }), false);
assert.equal(aiWorkflow.sourceUsable({ kind:'web', url:'https://127.0.0.1/policy', status:'available', verification_status:'verified' }), false);
assert.equal(aiWorkflow.sourceUsable({ kind:'web', url:'https://example.com/policy', status:'available', verification_status:'verified', last_verified_at:'2026-08-18T00:00:00.000Z' }), true);

let pendingReject;
const sandbox = {
  console, URL, setTimeout, clearTimeout, AbortController,
  fetch:(_url, options) => new Promise((_resolve, reject) => {
    pendingReject = reject;
    options.signal.addEventListener('abort', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    }, { once:true });
  }),
};
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename:'cwb-ai-hardening.js' });

assert.equal(sandbox.CWBAI.extractResponseText({ choices:[{ message:{ content:[{ type:'text', text:'片段一' }, { type:'text', text:'片段二' }] } }] }), '片段一片段二');
const nestedRedacted = sandbox.CWBAI.redact({ contact:{ phone:'13812345678', name:'张三' }, identity:{ name:'张三', student_number:'20240001' } }, { categories:['contact'] });
assert.equal(nestedRedacted.contact.phone, '13812345678');
assert.equal(nestedRedacted.contact.name, '[已脱敏]', 'contact authorization must not implicitly authorize nested identity fields');
assert.equal(nestedRedacted.identity.name, '[已脱敏]');

(async () => {
  await assert.rejects(
    () => sandbox.CWBAI.sendChat({ key:'custom', baseUrl:'https://example.test/v1', model:'demo' }, [{ role:'user', content:'请求' }], { apiKey:'test-key', useRelay:false, timeoutMs:1000 }),
    /AI_PROVIDER_REQUEST_TIMEOUT/,
  );
  assert.equal(typeof pendingReject, 'function');
  sandbox.fetch = async () => ({ ok:true, async json() { return { source:{ url:'https://another.example/policy', title:'错误来源' } }; } });
  await assert.rejects(
    () => sandbox.CWBAI.fetchPublicSource({ url:'https://example.com/policy' }, { relayUrl:'/api/ai/source' }),
    /AI_SOURCE_FETCH_INVALID_RESPONSE/,
  );
  console.log('PASS cwb-ai-hardening');
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
