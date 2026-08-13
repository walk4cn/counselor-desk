const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium, requireBrowserExecutable } = require('../scripts/browser-runtime');

const ROOT = path.resolve(__dirname, '..');
const CANONICAL = ['orgs', 'party', 'rewards', 'activities', 'grades', 'worklogs'];

function contentType(file) {
  if (file.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  if (file.endsWith('.png')) return 'image/png';
  return 'text/html; charset=utf-8';
}

function createServer() {
  return http.createServer((request, response) => {
    const requestPath = decodeURIComponent(String(request.url || '/').split('?')[0]);
    const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
    const file = path.resolve(ROOT, relative);
    if (!file.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, { 'content-type': contentType(file), 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(response);
  });
}

(async () => {
  const executablePath = requireBrowserExecutable('V8_CANONICAL_IDB');
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const browser = await chromium.launch({ headless:true, executablePath });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    const url = `http://127.0.0.1:${port}/`;
    await page.goto(url, { waitUntil:'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.dataset.v8Ready === 'true');
    const written = await page.evaluate(async canonical => {
      const expected = {};
      for (const [index, key] of canonical.entries()) {
        const row = { id:`idb-${key}`, title:`${key} record`, student_number:`2024${index}` };
        await window.CWB.repositories[key].put(row);
        expected[key] = row;
      }
      await window.CWB.workspace.flush();
      return expected;
    }, CANONICAL);
    const atomicReplace = await page.evaluate(async () => {
      const rows = Array.from({ length:1200 }, (_, index) => ({
        id:`atomic-student-${index}`,
        student_number:`ATOMIC-${index}`,
        full_name:`Atomic Student ${index}`,
      }));
      await window.CWB.repositories.students.putMany(rows, { normalized:true, render:false });
      return rows.length;
    });
    await page.reload({ waitUntil:'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.dataset.v8Ready === 'true');
    const result = await page.evaluate(async canonical => {
      const repositories = {};
      for (const key of canonical) repositories[key] = await window.CWB.repositories[key].get(`idb-${key}`);
      const stores = await new Promise((resolve, reject) => {
        const request = indexedDB.open('counselor_desk_v4');
        request.onsuccess = () => { const database = request.result; const names = [...database.objectStoreNames]; database.close(); resolve(names); };
        request.onerror = () => reject(request.error);
      });
      const atomicRows = await new Promise((resolve, reject) => {
        const request = indexedDB.open('counselor_desk_v4');
        request.onerror = () => reject(request.error || new Error('INDEXEDDB_OPEN_FAILED'));
        request.onsuccess = () => {
          const database = request.result;
          const read = database.transaction('records_students', 'readonly').objectStore('records_students').getAll();
          read.onsuccess = () => { database.close(); resolve(read.result || []); };
          read.onerror = () => { database.close(); reject(read.error || new Error('INDEXEDDB_READ_FAILED')); };
        };
      });
      return { repositories, stores, atomicRows };
    }, CANONICAL);
    for (const key of CANONICAL) {
      assert.equal(result.repositories[key].id, written[key].id, `${key} must survive a real IndexedDB restart`);
      assert.ok(result.stores.includes(`records_${key}`), `records_${key} must exist in the shared IndexedDB schema`);
    }
    assert.equal(atomicReplace, 1200, 'atomic replacement writes its full request chain');
    assert.equal(result.atomicRows.length, 1200, 'atomic replacement survives a real IndexedDB reopen');
    assert.equal(result.atomicRows[0].student_number, 'ATOMIC-0', 'atomic replacement keeps the first row');
    assert.equal(result.atomicRows.some(row => row.student_number === 'ATOMIC-1199'), true, 'atomic replacement keeps the final row');
    assert.deepEqual(errors, [], 'canonical collection persistence must not emit page errors');
    console.log('PASS v8-canonical-idb-browser');
  } finally {
    await context.close();
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
