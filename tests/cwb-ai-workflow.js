const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('src/core/cwb-ai-workflow.js', 'utf8');
const sandbox = { console };
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename:'cwb-ai-workflow.js' });

const workflow = sandbox.CWBAIWorkflow;
assert.ok(workflow, 'CWBAIWorkflow should be exposed');

const provider = {
  id:'provider-1',
  enabled:true,
  allowedPurposes:['work_summary'],
  dailyQuota:1,
};

assert.throws(
  () => workflow.authorize(provider, 'certificate_recognition', [], new Date('2026-08-17T10:00:00')),
  /AI_PURPOSE_NOT_ALLOWED/,
);
assert.throws(
  () => workflow.authorize(provider, 'work_summary', [{ purpose:'work_summary', status:'completed', created_at:'2026-08-17T01:00:00.000Z' }], new Date('2026-08-17T10:00:00')),
  /AI_DAILY_QUOTA_EXCEEDED/,
);
assert.throws(
  () => workflow.authorize({ enabled:false, allowedPurposes:['work_summary'] }, 'work_summary', []),
  /AI_PROVIDER_DISABLED/,
);

const decision = workflow.authorize(provider, 'work_summary', [], new Date('2026-08-17T10:00:00'));
assert.equal(decision.used, 0);
assert.equal(decision.remaining, 1);

const draft = workflow.normalizeDraft({
  id:'draft-1',
  kind:'certificate',
  provider_id:'provider-1',
  student_id:'student-1',
  source_attachment_id:'att-1',
  payload:{ title:'国家奖学金' },
  created_at:'2026-08-17T10:00:00.000Z',
});
assert.equal(draft.schema_version, 8);
assert.equal(draft.status, 'draft');
assert.equal(draft.student_id, 'student-1');
assert.equal(draft.source_attachment_id, 'att-1');
assert.equal(draft.payload.title, '国家奖学金');

const parsed = workflow.parseCertificateResponse('```json\n{"title":"国家奖学金","level":"一等奖","date":"2026-06-01"}\n```');
assert.equal(parsed.title, '国家奖学金');
assert.equal(parsed.level, '一等奖');
assert.equal(parsed.date, '2026-06-01');

const fallback = workflow.parseCertificateResponse('无法可靠识别颁发单位');
assert.equal(fallback.title, '');
assert.equal(fallback.summary, '无法可靠识别颁发单位');

console.log('PASS cwb-ai-workflow');
