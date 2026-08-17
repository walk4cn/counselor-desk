const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => { if (!/scrollTo|Could not load|Not implemented/i.test(error.message)) errors.push(error.message); });
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
    .replace('<script defer src="src/core/cwb-ai.js" data-cwb-ai></script>', `<script>${fs.readFileSync(path.join(root, 'src', 'core', 'cwb-ai.js'), 'utf8')}</script>`)
    .replace('<script defer src="src/core/cwb-ai-workflow.js" data-cwb-ai-workflow></script>', `<script>${fs.readFileSync(path.join(root, 'src', 'core', 'cwb-ai-workflow.js'), 'utf8')}</script>`);
  const dom = new JSDOM(html, {
    runScripts:'dangerously', resources:'usable', url:'https://ai-workflow.local/', pretendToBeVisual:true, virtualConsole,
  });
  await wait(750);
  const { CWB } = dom.window;
  assert.ok(CWB.ai && typeof CWB.ai.run === 'function', 'AI workflow API should be exposed');
  const provider = { id:'provider-1', key:'custom', model:'demo', enabled:true, allowedPurposes:['work_summary'], dailyQuota:1 };
  CWB.db.custom.v4_ai_providers = [provider];
  await assert.rejects(() => CWB.ai.run({ provider, purpose:'certificate_recognition', records:[], send:async () => ({ text:'ignored' }) }), /AI_PURPOSE_NOT_ALLOWED/);
  assert.equal(CWB.db.custom.v4_ai_audit.at(-1).status, 'failed');
  assert.equal((CWB.db.custom.v4_ai_drafts || []).length, 0);
  const result = await CWB.ai.run({ provider, purpose:'work_summary', records:[], send:async () => ({ text:'本周完成两项工作' }) });
  assert.equal(result.draft.payload.text, '本周完成两项工作');
  assert.equal(CWB.db.custom.v4_ai_drafts.length, 1);
  assert.equal(CWB.db.custom.v4_ai_audit.at(-1).status, 'completed');
  await assert.rejects(() => CWB.ai.run({ provider, purpose:'work_summary', records:[], send:async () => ({ text:'ignored' }) }), /AI_DAILY_QUOTA_EXCEEDED/);
  assert.deepEqual(errors, []);
  dom.window.close();
  console.log('PASS ai-workflow-ui');
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
