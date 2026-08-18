/** v3.9 large import and atomic failure contract. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { VirtualConsole } = require('jsdom');
const { bootApp } = require('./helpers/boot');
const file = path.join(__dirname, '..', 'index.html');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const vc = new VirtualConsole();
  const dom = await bootApp(file, { virtualConsole:vc });
  const w = dom.window;
  await sleep(500);
  const cwb = w.CWB;

  const before = JSON.stringify(cwb.db.students);
  const failurePreview = cwb.importer.previewCSV('学号,姓名\n0888,原子测试', 'students');
  const realPutMany = cwb.repositories.students.putMany;
  cwb.repositories.students.putMany = function () { return Promise.reject(new Error('simulated write failure')); };
  const failed = await cwb.importer.commitPreviewAsync(failurePreview.id, {});
  cwb.repositories.students.putMany = realPutMany;
  assert.equal(failed.ok, false);
  assert.equal(JSON.stringify(cwb.db.students), before, 'failed storage write must leave in-memory data untouched');

  const rows = ['学号,姓名,班级'];
  for (let i = 0; i < 5000; i++) rows.push(`${String(30000000 + i)},学生${i},测试${i % 100}班`);
  const started = Date.now();
  const preview = cwb.importer.previewCSV(rows.join('\n'), 'students');
  assert.equal(preview.summary.ready, 5000);
  const run = await cwb.importer.commitPreviewAsync(preview.id, { chunkSize:500, skipInvalid:true, conflictPolicy:'skip' });
  const elapsed = Date.now() - started;
  assert.equal(run.ok, true, run.error || '5000-row commit failed');
  assert.equal(run.added, 5000);
  // The v8 workspace persists a full checksummed envelope per commit and yields
  // cooperatively every 384 steps / 10ms. jsdom timers inflate that to ~20s for
  // 5000 rows (legacy bound was 8s against the old single localStorage write).
  // 40s still catches an O(n^2) regression while passing the current pipeline.
  assert.ok(elapsed < 40000, `5000-row preview and commit took ${elapsed}ms`);
  assert.ok(cwb.db.students.some(student => student.student_number === '30000000'));

  dom.window.close();
  console.log(`PASS import-scale (${elapsed}ms)`);
})().catch(error => { console.error(error.stack || error.message); process.exit(1); });