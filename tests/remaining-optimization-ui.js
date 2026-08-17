const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

assert.match(html, /data-v4-employment-category/, 'employment page should expose category filter');
assert.match(html, /data-v4-employment-audience/, 'employment page should expose audience filter');
assert.match(html, /data-v4-employment-status/, 'employment page should expose status filter');
assert.match(html, /data-v4-employment-favorites/, 'employment page should expose favorite-only filter');
assert.match(html, /data-act="v4-employment-favorite"/, 'employment cards should expose favorite action');
assert.match(html, /data-act="v4-employment-edit"/, 'employment cards should expose edit action');
assert.match(html, /data-act="v4-employment-csv-export"/, 'employment page should expose CSV export');
assert.match(html, /data-act="v4-employment-csv-import"/, 'employment page should expose CSV import');

assert.match(html, /data-ai-range-from/, 'AI page should expose summary start date');
assert.match(html, /data-ai-range-to/, 'AI page should expose summary end date');
assert.match(html, /data-act="ai-summary-generate"/, 'AI page should expose date-scoped summary generation');
assert.match(html, /data-act="ai-summary-confirm"/, 'AI page should expose confirmed worklog action');
assert.match(html, /data-act="ai-cancel"/, 'AI page should expose cancellation action');
assert.match(html, /aiRunDraft\([^\n]*signal/, 'AI runner should pass cancellation signal');

assert.match(html, /CWB\.ai\.createCertificateDraft/, 'certificate handler should create governed draft');
assert.match(html, /CWB\.ai\.confirmCertificateDraft/, 'certificate handler should confirm governed draft');
assert.doesNotMatch(html, /DB\.rewards\.push\(/, 'certificate workflow must not write rewards directly from UI handler');
assert.match(html, /const PHONE_SYNC_CUSTOM_KEYS = CWB_COLLECTIONS\.custom/, 'phone sync should derive custom collections from manifest');
assert.match(html, /const workspaceCustomKeys = CWB_COLLECTIONS\.custom\.filter\(key => key !== 'v4_test_snapshots'\)/, 'workspace cleanup should derive custom collections from manifest while preserving snapshots');

console.log('PASS remaining-optimization-ui');
