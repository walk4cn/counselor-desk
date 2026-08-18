const assert = require('node:assert/strict');
const path = require('node:path');
const { VirtualConsole } = require('jsdom');
const { bootApp } = require('./helpers/boot');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', error => {
    if (!/scrollTo|Not implemented|Could not load|getaddrinfo/i.test(String(error && error.message))) errors.push(String(error && error.message));
  });
  vc.on('error', (...args) => errors.push(args.join(' ')));
  const dom = await bootApp(path.join(__dirname, '..', 'index.html'), {
    virtualConsole: vc,
    beforeParse(window) { window.require = require; window.crypto = require('node:crypto').webcrypto; },
  });
  await wait(1400);
  const { window: w } = dom;
  const d = w.document;
  const c = w.CWB;
  assert.ok(c, 'CWB should be available');
  assert.ok(w.CWB && w.CWB.workspace, 'v8 workspace should be available');

  const workspaceStudents = () => (w.CWB.workspace.getState().students || []).length;
  assert.ok(workspaceStudents() > 0, 'the workspace should hold students before the race');

  c.db.students = [];
  c.go('students');
  await wait(80);
  assert.equal(d.querySelectorAll('[data-student-row]').length, 0, 'an early pre-hydration render with an empty list shows no rows');

  const backup = await w.CWBv8.createWorkspace({ initialState: w.CWB.workspace.getState() }).createBackup({ source: 'test-hydrate' });
  await w.CWB.workspace.hydrateBackup(backup, 'test-hydrate');
  await wait(200);
  assert.ok(c.db.students.length > 0, 'hydration restores the student data into the live DB');
  const rows = d.querySelectorAll('[data-student-row]').length;
  assert.ok(rows > 0, `the ledger should re-filter against the hydrated students instead of serving the stale empty cache (rows=${rows})`);

  assert.deepEqual(errors, []);
  dom.window.close();
  console.log('PASS ledger-hydrate-staleness');
})().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});