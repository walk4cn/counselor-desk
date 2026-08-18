const assert = require('node:assert/strict');
const path = require('node:path');
const { TextEncoder, TextDecoder } = require('node:util');
const { VirtualConsole } = require('jsdom');
const { bootApp } = require('./helpers/boot');

const page = path.join(__dirname, '..', 'index.html');
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
    if (full.includes('/rest/v1/workspace_records')) {
      if (init.method === 'GET') return respond(200, Array.from(storage.values()).map(record => ({ payload: record.payload })));
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

async function openApp(mock, bridge, virtualConsole) {
  const dom = await bootApp(page, {
    virtualConsole,
    beforeParse(window) {
      window.TextEncoder = TextEncoder;
      window.TextDecoder = TextDecoder;
      window.fetch = mock.fetch;
      window.cwbDesktop = bridge.api;
    },
  });
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (dom.window.CWB && dom.window.document.documentElement.dataset.v4Ready === 'true'
      && dom.window.document.documentElement.dataset.v8Ready === 'true'
      && dom.window.CWBSupabase && dom.window.CWB.supabase) break;
    await wait(50);
  }
  return dom;
}

async function run() {
  const virtualConsole = new VirtualConsole();
  const errors = [];
  virtualConsole.on('jsdomError', error => errors.push(String(error && error.message || error)));
  const mock = createMockSupabase();
  const bridge = createDesktopBridge();
  const dom = await openApp(mock, bridge, virtualConsole);

  assert.ok(dom.window.CWB, 'the app boots with the supabase module installed');
  assert.equal(dom.window.CWBSupabase.isConfigured(), false, 'no config before setup');
  dom.window.CWBSupabase.setConfig({ url: 'https://demo.supabase.co', anonKey: 'anon-key' });
  assert.equal(dom.window.CWBSupabase.isConfigured(), true, 'config is recognised');
  assert.equal(dom.window.CWBSupabase.isActive(), false, 'no active session before sign in');

  const session = await dom.window.CWBSupabase.signIn('demo@example.com', 'password123');
  assert.ok(session && session.access_token, 'sign-in returns a session from the mocked auth endpoint');
  assert.equal(dom.window.CWBSupabase.isActive(), true, 'session becomes active after sign in');

  const synced = await dom.window.CWB.supabase.syncNow();
  assert.ok(synced.pushed === true, 'an empty cloud receives the local workspace on first sync');
  assert.equal(mock.storage.has('workspace_v8_active'), true, 'the pointer row reaches the cloud table');
  const chunks = Array.from(mock.storage.values()).filter(record => record.payload && record.payload.kind === 'workspace_v8_chunk');
  assert.ok(chunks.length > 0, 'chunk rows reach the cloud table');
  const pointer = mock.storage.get('workspace_v8_active').payload;
  assert.equal(Number(pointer.active.schemaVersion), 8, 'the cloud pointer is schema v8');
  const expectedGenerations = new Set([pointer.active.generation, ...pointer.previous.map(item => item.generation)]);
  assert.equal(chunks.every(chunk => expectedGenerations.has(chunk.payload.generation)), true, 'cloud chunks belong to retained generations');

  const statusElement = dom.window.document.querySelector('[data-save-status]');
  assert.ok(statusElement, 'the save status element exists');
  assert.ok(statusElement.textContent.includes('云端'), 'save status reflects the cloud mode');

  dom.window.document.querySelector('#btn-settings').click();
  await wait(120);
  const statusHint = dom.window.document.querySelector('#supabase-status');
  assert.ok(statusHint, 'the settings modal renders the cloud sync section');
  assert.ok(String(statusHint.textContent).includes('已连接'), 'the settings section reports the signed-in user');

  dom.window.close();
  const fatalErrors = errors.filter(message => !message.includes('not implemented') && !message.includes('Not implemented') && !message.includes('Could not parse CSS'));
  assert.deepEqual(fatalErrors, [], `no fatal script errors during the boot flow: ${fatalErrors.join(' | ')}`);

  console.log('PASS supabase-browser-contract');
}

run().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});