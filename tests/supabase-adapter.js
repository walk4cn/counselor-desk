const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const supabase = require('../src/core/cwb-supabase.js');
const { createWorkspacePersistence } = require('../src/core/v8-persistence-protocol.js');

const digest = async bytes => {
  let hash = 2166136261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

function createMockSupabase() {
  const storage = new Map();
  const calls = [];
  let sessionSerial = 0;
  const expireNextLogin = { current: false };
  const secondsNow = () => Math.floor(Date.now() / 1000);
  const fetch = async (url, init = {}) => {
    const full = String(url);
    calls.push({ url: full, method: init.method || 'GET' });
    const base = 'https://demo.supabase.co';
    const body = init.body ? JSON.parse(init.body) : null;
    const respond = (status, payload) => ({
      ok: status >= 200 && status < 300,
      status,
      text: async () => payload == null ? '' : JSON.stringify(payload),
    });
    if (full.startsWith(`${base}/auth/v1/token?grant_type=password`)) {
      const expired = expireNextLogin.current;
      expireNextLogin.current = false;
      return respond(200, {
        access_token: `at-${++sessionSerial}`, refresh_token: 'rt-1', expires_in: 3600, token_type: 'bearer',
        expires_at: secondsNow() + (expired ? -60 : 3600),
        user: { id: 'user-1', email: body.email },
      });
    }
    if (full.startsWith(`${base}/auth/v1/signup`)) {
      return respond(200, {
        access_token: `at-${++sessionSerial}`, refresh_token: 'rt-1', expires_in: 3600,
        expires_at: secondsNow() + 3600,
        user: { id: 'user-1', email: body.email },
      });
    }
    if (full.startsWith(`${base}/auth/v1/logout`)) return respond(204, null);
    if (full.startsWith(`${base}/auth/v1/token?grant_type=refresh_token`)) {
      return respond(200, {
        access_token: 'at-refreshed', refresh_token: 'rt-2', expires_in: 3600,
        expires_at: secondsNow() + 3600,
        user: { id: 'user-1', email: 'demo@example.com' },
      });
    }
    if (full.includes('/rest/v1/workspace_records')) {
      if (init.method === 'GET') {
        return respond(200, Array.from(storage.values()).map(record => ({ payload: record.payload })));
      }
      if (init.method === 'POST') {
        storage.set(String(body.id), { id: String(body.id), payload: body.payload });
        return respond(201, null);
      }
      if (init.method === 'DELETE') {
        const match = full.match(/id=eq\.([^&]+)/);
        if (match) storage.delete(decodeURIComponent(match[1]));
        return respond(204, null);
      }
    }
    return respond(404, { msg: 'not found' });
  };
  return { storage, calls, fetch, expireNextLogin };
}

function makeEnvelope(title, revision) {
  return {
    schemaVersion: 8,
    revision,
    data: { settings: { title }, students: [{ id: `s-${revision}`, full_name: title }] },
  };
}

async function run() {
  const mock = createMockSupabase();
  global.fetch = mock.fetch;

  supabase.setConfig({ url: 'https://demo.supabase.co', anonKey: 'anon-key' });
  assert.equal(supabase.isConfigured(), true, 'config is recognised');
  assert.equal(supabase.isActive(), false, 'no session before sign in');

  const signup = await supabase.signUp('demo@example.com', 'password123');
  assert.ok(signup.access_token, 'sign-up returns a session token');
  assert.equal(supabase.isActive(), true, 'sign-up activates the session');
  await supabase.signOut();
  assert.equal(supabase.isActive(), false, 'sign-out clears the session');
  await supabase.signIn('demo@example.com', 'password123');
  assert.equal(supabase.isActive(), true, 'a session with second-precision expires_at counts as active (regression: unix seconds vs Date.now() ms)');
  assert.equal(supabase.status().user.email, 'demo@example.com');

  await supabase.signOut();
  mock.expireNextLogin.current = true;
  await supabase.signIn('demo@example.com', 'password123');
  assert.equal(supabase.isActive(), false, 'an expired session is not active until refreshed');
  const refreshAdapter = supabase.createV8Adapter();
  await refreshAdapter.list();
  assert.equal(supabase.isActive(), true, 'the first adapter call refreshes the expired session');
  await supabase.signIn('demo@example.com', 'password123');
  assert.equal(supabase.isActive(), true, 're-sign-in restores the active session');

  const mirror = { puts: [], deletes: [], async list() { return []; }, async put(record) { this.puts.push(String(record.id)); }, async delete(id) { this.deletes.push(String(id)); } };
  const adapter = supabase.createV8Adapter({ mirror });
  let nowTick = 0;
  const persistence = createWorkspacePersistence({
    adapter,
    digest,
    chunkBytes: 64,
    now: () => `2026-08-18T00:00:0${++nowTick}.000Z`,
  });

  const committed = await persistence.commit(makeEnvelope('cloud-first', 3));
  assert.equal(committed.committed, true);
  assert.equal(mock.storage.has('workspace_v8_active'), true, 'pointer row is written to the cloud table');
  const chunks = Array.from(mock.storage.values()).filter(record => record.payload && record.payload.kind === 'workspace_v8_chunk');
  assert.ok(chunks.length > 1, 'the envelope is chunked into several cloud rows');
  assert.equal(mirror.puts[mirror.puts.length - 1], 'workspace_v8_active', 'the local mirror receives the pointer last');

  const loaded = await persistence.read();
  assert.equal(loaded.envelope.data.settings.title, 'cloud-first');
  assert.equal(loaded.recovered, false, 'a clean cloud generation reads without recovery');

  const secondPersistence = createWorkspacePersistence({
    adapter: supabase.createV8Adapter(),
    digest,
    chunkBytes: 64,
  });
  const secondLoaded = await secondPersistence.read();
  assert.equal(secondLoaded.envelope.data.settings.title, 'cloud-first', 'a second device reads the same cloud workspace');
  await secondPersistence.commit(makeEnvelope('cloud-second', 4));
  const refreshed = await persistence.read();
  assert.equal(refreshed.envelope.data.settings.title, 'cloud-second', 'the first device sees the second device commit (last-writer-wins)');

  const brokenMirror = { async put() { throw new Error('mirror down'); }, async delete() { throw new Error('mirror down'); } };
  const resilientAdapter = supabase.createV8Adapter({ mirror: brokenMirror });
  const resilientPersistence = createWorkspacePersistence({ adapter: resilientAdapter, digest, chunkBytes: 64 });
  const resilientCommit = await resilientPersistence.commit(makeEnvelope('resilient', 5));
  assert.equal(resilientCommit.committed, true, 'a failing local mirror never blocks cloud persistence');
  assert.equal((await resilientPersistence.read()).envelope.data.settings.title, 'resilient');

  const orphanId = 'workspace_v8_chunk:g_orphan:0';
  await adapter.put({ id: orphanId, kind: 'workspace_v8_chunk', generation: 'g_orphan', index: 0, chunkCount: 1, protocolVersion: 1, encoding: 'base64', value: 'AA==' });
  await adapter.delete(orphanId);
  assert.equal(mock.storage.has(orphanId), false, 'adapter delete removes the cloud row');

  await supabase.signOut();
  await assert.rejects(() => adapter.put({ id: 'x', kind: 'x' }), /登录/, 'writes are rejected when signed out');
  await assert.rejects(() => supabase.createV8Adapter().list(), /登录/, 'reads are rejected when signed out');
  supabase.setConfig(null);
  await assert.rejects(() => supabase.createV8Adapter().list(), /项目地址/, 'reads are rejected when unconfigured');
  supabase.setConfig({ url: 'https://demo.supabase.co', anonKey: 'anon-key' });

  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://demo.app', runScripts: 'outside-only' });
  dom.window.fetch = mock.fetch;
  dom.window.localStorage.setItem('cwb_supabase_config', JSON.stringify({ url: 'https://demo.supabase.co', anonKey: 'anon-key' }));
  dom.window.localStorage.setItem('cwb_supabase_session', JSON.stringify({
    access_token: 'stale', refresh_token: 'rt-stale', expires_at: Date.now() - 1000, user: { id: 'user-1', email: 'demo@example.com' },
  }));
  dom.window.eval(fs.readFileSync('src/core/cwb-supabase.js', 'utf8'));
  assert.equal(typeof dom.window.CWBSupabase.createV8Adapter, 'function', 'the browser UMD global is available');
  const restored = await dom.window.CWBSupabase.init();
  assert.equal(restored.access_token, 'at-refreshed', 'an expired stored session refreshes via the refresh token');
  assert.equal(dom.window.CWBSupabase.isActive(), true, 'the browser global activates after refresh');
  dom.window.close();

  console.log('PASS supabase-adapter');
}

run().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});