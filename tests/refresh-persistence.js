const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { VirtualConsole } = require('jsdom');
const { bootApp } = require('./helpers/boot');

const page = 'index.html';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

function createDesktopBridge() {
  const collections = new Map();
  const recordsFor = collection => {
    if (!collections.has(collection)) collections.set(collection, new Map());
    return collections.get(collection);
  };
  return {
    api: {
      async repositoryList(collection) { return [...recordsFor(collection).values()].map(clone); },
      async repositoryGet(collection, id) { return clone(recordsFor(collection).get(String(id)) || null); },
      async repositoryPut(collection, record) { recordsFor(collection).set(String(record.id), clone(record)); return clone(record); },
      async repositoryPutMany(collection, values) { values.forEach(value => recordsFor(collection).set(String(value.id), clone(value))); return values.map(clone); },
      async repositoryReplaceManyAtomic(collection, values) { collections.set(collection, new Map(values.map(value => [String(value.id), clone(value)]))); return values.map(clone); },
      async repositoryDelete(collection, id) { return recordsFor(collection).delete(String(id)); },
      async repositoryCount(collection) { return recordsFor(collection).size; },
      async writeAttachment(input) { return { id:input && input.id }; },
      async readAttachment() { return null; },
      async deleteAttachment() { return true; },
      async saveBackup() { return { saved:false, reason:'test' }; },
      async openBackup() { return null; },
      async setBackupSecret() { return true; },
      async getBackupSecret() { return ''; },
      async pruneBackups() { return 0; },
      async getVaultStatus() { return { available:false }; },
      async chooseBackupFolder() { return null; },
      async openDataFolder() { return null; },
      async openExternal() { return true; },
    },
  };
}

function createMockSupabase() {
  const storage = new Map();
  const fetch = async (url, init = {}) => {
    const full = String(url);
    const base = 'https://demo.supabase.co';
    const body = init.body ? JSON.parse(init.body) : null;
    const respond = (status, payload) => ({ ok: status >= 200 && status < 300, status, text: async () => payload == null ? '' : JSON.stringify(payload) });
    if (full.startsWith(`${base}/auth/v1/token?grant_type=password`)) {
      return respond(200, { access_token: 'at-1', refresh_token: 'rt-1', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'user-1', email: 'demo@example.com' } });
    }
    if (full.startsWith(`${base}/auth/v1/logout`)) return respond(204, null);
    if (full.startsWith(`${base}/auth/v1/token?grant_type=refresh_token`)) {
      return respond(200, { access_token: 'at-2', refresh_token: 'rt-2', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'user-1', email: 'demo@example.com' } });
    }
    if (full.includes('/rest/v1/workspace_records')) {
      if (init.method === 'GET') return respond(200, Array.from(storage.values()).map(record => ({ id: record.id, payload: record.payload })));
      if (init.method === 'POST') { storage.set(String(body.id), { id: String(body.id), payload: body.payload }); return respond(201, null); }
      if (init.method === 'DELETE') {
        const match = full.match(/id=eq\.([^&]+)/);
        if (match) storage.delete(decodeURIComponent(match[1]));
        return respond(204, null);
      }
    }
    return respond(404, { msg: 'not found' });
  };
  return { storage, fetch };
}

async function openApp(bridge, mock, virtualConsole, filePath) {
  const dom = await bootApp(filePath || page, {
    virtualConsole,
    beforeParse(window) {
      if (mock) window.fetch = mock.fetch;
      if (bridge) window.cwbDesktop = bridge.api;
    },
  });
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (dom.window.CWB && dom.window.document.documentElement.dataset.v4Ready === 'true'
      && dom.window.document.documentElement.dataset.v8Ready === 'true') break;
    await wait(50);
  }
  assert.equal(dom.window.document.documentElement.dataset.v8Ready, 'true', 'the v8 workspace must be ready');
  return dom;
}

function openAppWithSeededSession(bridge, mock, virtualConsole, session, config) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const seed = `<script>window.localStorage.setItem('cwb_supabase_config', ${JSON.stringify(JSON.stringify(config))});window.localStorage.setItem('cwb_supabase_session', ${JSON.stringify(JSON.stringify(session))});</script>`;
  const seeded = html.replace('<script defer src="src/core/cwb-supabase.js" data-cwb-supabase>', seed + '<script defer src="src/core/cwb-supabase.js" data-cwb-supabase>');
  const temp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cwb-refresh-')), 'index.html');
  fs.writeFileSync(temp, seeded);
  return openApp(bridge, mock, virtualConsole, temp);
}

function addStudent(dom) {
  const w = dom.window;
  const before = w.CWB.db.students.length;
  w.CWB.db.students.push({ id:`stu-${Date.now()}`, student_number:String(10000 + before), full_name:'张三', gender:'男', class_name:'计科2401', schema_version:8 });
  return w.CWB_V4_SYNC('students');
}

async function waitForSaveStatus(dom, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const element = dom.window.document.querySelector('[data-save-status]');
    if (element && element.dataset.state === 'saved') return true;
    await wait(50);
  }
  return false;
}

async function run() {
  const virtualConsole = new VirtualConsole();
  const errors = [];
  virtualConsole.on('jsdomError', error => { const m = String(error && error.message || error); if (!/not implemented|Not implemented|Could not parse CSS|scrollTo|getContext/i.test(m)) errors.push(m); });

  const bridge = createDesktopBridge();

  const dom1 = await openApp(bridge, null, virtualConsole);
  await addStudent(dom1);
  assert.ok(await waitForSaveStatus(dom1), 'local save completes');
  assert.ok(dom1.window.CWB.db.students.some(s => s.full_name === '张三'), '张三 appears in the live DB');
  assert.equal(dom1.window.document.querySelector('[data-save-status]').dataset.state, 'saved', 'save status shows saved');
  dom1.window.close();

  const dom2 = await openApp(bridge, null, virtualConsole);
  const afterRefresh = dom2.window.CWB.db.students.some(s => s.full_name === '张三');
  dom2.window.close();
  assert.equal(afterRefresh, true, 'LOCAL MODE: a student added before refresh survives a page reload');

  const mock = createMockSupabase();
  const dom3 = await openApp(null, mock, virtualConsole);
  dom3.window.CWBSupabase.setConfig({ url: 'https://demo.supabase.co', anonKey: 'anon-key' });
  await dom3.window.CWBSupabase.signIn('demo@example.com', 'password123');
  await addStudent(dom3);
  assert.ok(await waitForSaveStatus(dom3), 'cloud save completes');
  assert.equal(dom3.window.document.querySelector('[data-save-status]').dataset.state, 'saved', 'cloud save status shows saved');
  const cloudHasStudent = Array.from(mock.storage.values())
    .some(record => {
      if (!record.payload || record.payload.kind !== 'workspace_v8_chunk') return false;
      const text = Buffer.from(String(record.payload.value || ''), 'base64').toString('utf8');
      return text.includes('张三');
    });
  assert.equal(cloudHasStudent, true, 'the cloud rows contain the new student');
  const configSnapshot = dom3.window.CWBSupabase.getConfig();
  const sessionSnapshot = JSON.parse(dom3.window.localStorage.getItem('cwb_supabase_session'));
  assert.ok(sessionSnapshot && sessionSnapshot.access_token, 'a session is stored in localStorage');
  dom3.window.close();

  const dom4 = await openAppWithSeededSession(null, mock, virtualConsole, sessionSnapshot, configSnapshot);
  const afterRefreshCloud = dom4.window.CWB.db.students.some(s => s.full_name === '张三');
  const restoredActive = dom4.window.CWBSupabase.isActive();
  dom4.window.close();
  assert.equal(restoredActive, true, 'the seeded session restores the cloud login after refresh');
  assert.equal(afterRefreshCloud, true, 'CLOUD MODE: a student added before refresh survives a reload via the restored cloud session (fresh mirror, cloud read only)');

  const fatal = errors.filter(m => !m.includes('deprecated') && !m.includes('ResizeObserver'));
  assert.deepEqual(fatal, [], `no fatal script errors: ${fatal.join(' | ')}`);
  console.log('PASS refresh-persistence');
}

run().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});