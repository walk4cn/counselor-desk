/* Supabase cloud sync for the schema-v8 workspace.
 *
 * The web app and the Electron desktop app stay local-first: the v8 workspace
 * persistence layer already speaks a storage-agnostic adapter interface
 * (list / put / delete). This module implements that interface on top of
 * Supabase (PostgREST + Auth REST) so the same account can reach the same
 * workspace from several devices without adding any build dependency.
 *
 * Data model: one row per workspace record in the `workspace_records` table.
 *   - id       text  primary key (workspace_v8_pointer or workspace_v8_chunk:...)
 *   - owner_id uuid  the authenticated user (RLS enforces owner isolation)
 *   - payload  jsonb the full record written by the v8 persistence protocol
 *
 * Setup: run supabase/schema.sql once in the Supabase SQL editor, then enter
 * the project URL and anon key in 设置 -> 云端同步（Supabase）.
 */
(function attachCWBSupabase(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CWBSupabase = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCWBSupabase(root) {
  'use strict';

  const CONFIG_KEY = 'cwb_supabase_config';
  const SESSION_KEY = 'cwb_supabase_session';
  const TABLE = 'workspace_records';
  const REFRESH_GRACE_MS = 30 * 1000;

  function safeStorage() {
    try {
      if (root && root.localStorage) {
        const probe = '__cwb_storage_probe__';
        root.localStorage.setItem(probe, '1');
        root.localStorage.removeItem(probe);
        return root.localStorage;
      }
    } catch (_) {}
    return null;
  }

  const memory = {};
  const storage = safeStorage();

  function readStored(key, fallback) {
    try {
      if (storage) {
        const raw = storage.getItem(key);
        if (raw != null) return JSON.parse(raw);
      }
      return key in memory ? memory[key] : fallback;
    } catch (_) { return key in memory ? memory[key] : fallback; }
  }

  function writeStored(key, value) {
    memory[key] = value;
    try { if (storage) storage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function removeStored(key) {
    delete memory[key];
    try { if (storage) storage.removeItem(key); } catch (_) {}
  }

  function notify() {
    if (root && typeof root.dispatchEvent === 'function' && typeof root.Event === 'function') {
      try { root.dispatchEvent(new root.Event('cwb:supabase-changed')); } catch (_) {}
    }
    listeners.forEach(listener => {
      try { listener(status()); } catch (_) {}
    });
  }

  const listeners = new Set();
  let config = readStored(CONFIG_KEY, null);
  let session = readStored(SESSION_KEY, null);
  let initPromise = null;

  function currentConfig() {
    if (config && typeof config === 'object' && String(config.url || '').trim() && String(config.anonKey || '').trim()) return config;
    return null;
  }

  function currentSession() {
    if (!session || !session.access_token || !session.refresh_token) return null;
    let expiresAt = Number(session.expires_at);
    if (expiresAt && expiresAt < 1e12) expiresAt *= 1000;
    if (expiresAt && expiresAt < Date.now()) return null;
    return session;
  }

  function isConfigured() {
    return !!currentConfig();
  }

  function isActive() {
    return !!(currentConfig() && currentSession());
  }

  function status() {
    return {
      configured:isConfigured(),
      active:isActive(),
      user:isActive() && session && session.user ? { id:session.user.id, email:session.user.email } : null,
      url:isConfigured() ? config.url : '',
    };
  }

  function requireContext() {
    const cfg = currentConfig();
    if (!cfg) {
      const error = new Error('请先在设置中填写 Supabase 项目地址与 anon 公开密钥');
      error.code = 'SUPABASE_NOT_CONFIGURED';
      throw error;
    }
    const sess = currentSession();
    if (!sess) {
      const error = new Error('请先在设置中登录 Supabase 账号');
      error.code = 'SUPABASE_NOT_SIGNED_IN';
      throw error;
    }
    return { config:cfg, session:sess };
  }

  function baseHeaders(cfg) {
    return { 'apikey':cfg.anonKey, 'Content-Type':'application/json' };
  }

  const AUTH_ERROR_HINTS = {
    'email_rate_limit_exceeded':'注册请求过于频繁，被邮箱服务限流。请等待 1 小时后再试，或先检查收件箱/垃圾邮件确认是否已收到验证邮件，收到后直接登录即可',
    'user_already_exists':'该邮箱已注册，请直接登录（若未验证过邮箱，可在登录失败后重新发送验证邮件）',
    'invalid_credentials':'邮箱或密码不正确',
    'email_not_confirmed':'邮箱尚未验证，请先到收件箱（含垃圾邮件）点击验证链接，再回来登录',
    'weak_password':'密码强度不足，请使用至少 8 位且包含字母与数字的密码',
    'over_email_send_rate_limit':'验证邮件发送过于频繁，请等待一段时间后再试',
    'signup_disabled':'此项目已关闭公开注册，请联系项目管理员开启 Email 注册',
    'captcha_failed':'人机验证未通过，请重试',
  };

  function requestError(statusCode, data, fallback) {
    const raw = data && (data.msg || data.message || data.error_description || data.error);
    const code = data && data.code || null;
    const message = raw ? String(raw) : fallback;
    const error = new Error(AUTH_ERROR_HINTS[code] || message);
    error.code = code;
    error.status = statusCode;
    error.data = data;
    return error;
  }

  async function request(method, path, options) {
    const cfg = currentConfig();
    if (!cfg) throw requestError(0, null, '请先配置 Supabase 项目地址与 anon 公开密钥');
    const headers = Object.assign({}, baseHeaders(cfg), options && options.headers || {});
    const init = { method, headers };
    if (options && options.body != null) init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    const response = await root.fetch(cfg.url.replace(/\/+$/, '') + path, init);
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) {}
    if (!response.ok) throw requestError(response.status, data, `HTTP ${response.status}`);
    return data;
  }

  function storeSession(payload) {
    if (!payload || !payload.access_token || !payload.refresh_token) return;
    let expiresAt = Number(payload.expires_at);
    if (expiresAt && expiresAt < 1e12) expiresAt *= 1000;
    if (!expiresAt && Number(payload.expires_in)) expiresAt = Date.now() + Number(payload.expires_in) * 1000;
    session = {
      access_token:payload.access_token,
      refresh_token:payload.refresh_token,
      token_type:payload.token_type || 'bearer',
      expires_at:expiresAt,
      user:payload.user && { id:payload.user.id, email:payload.user.email } || null,
    };
    writeStored(SESSION_KEY, session);
    notify();
  }

  function clearSession() {
    session = null;
    removeStored(SESSION_KEY);
    notify();
  }

  async function refreshSession() {
    const cfg = currentConfig();
    const stored = session;
    if (!cfg || !stored || !stored.refresh_token) return null;
    try {
      const payload = await request('POST', '/auth/v1/token?grant_type=refresh_token', {
        body:{ refresh_token:stored.refresh_token },
      });
      storeSession(payload);
      return currentSession();
    } catch (error) {
      clearSession();
      return null;
    }
  }

  function init() {
    if (!initPromise) {
      initPromise = (async () => {
        try {
          if (currentSession()) return currentSession();
          if (!session || !session.refresh_token) return null;
          return refreshSession();
        } finally {
          if (!currentSession()) initPromise = null;
        }
      })().catch(() => null);
    }
    return initPromise;
  }

  function resetInit() {
    initPromise = null;
  }

  function signUp(email, password) {
    return request('POST', '/auth/v1/signup', { body:{ email, password, data:{ app:'counselor-desk' } } }).then(payload => {
      if (payload && payload.access_token) storeSession(payload);
      return payload;
    });
  }

  function signIn(email, password) {
    return request('POST', '/auth/v1/token?grant_type=password', {
      body:{ email, password },
    }).then(payload => {
      storeSession(payload);
      resetInit();
      return payload;
    });
  }

  async function signOut() {
    const active = currentSession();
    if (active) {
      try {
        await request('POST', '/auth/v1/logout', {
          headers:{ Authorization:`Bearer ${active.access_token}` },
        });
      } catch (_) {}
    }
    clearSession();
    resetInit();
    return true;
  }

  function encodeRecord(record) {
    if (!record || record.id == null) throw new Error('SUPABASE_RECORD_ID_REQUIRED');
    return { id:String(record.id), payload:record };
  }

  function createV8Adapter(options) {
    const mirror = options && options.mirror && typeof options.mirror.put === 'function' ? options.mirror : null;
    let queue = Promise.resolve();
    const enqueue = task => {
      const run = queue.then(task);
      queue = run.catch(() => undefined);
      return run;
    };
    return {
      async list() {
        await init();
        const { session } = requireContext();
        const rows = await request('GET', `/rest/v1/${TABLE}?select=payload&limit=100000`, {
          headers:{ Authorization:`Bearer ${session.access_token}` },
        });
        return Array.isArray(rows) ? rows.map(row => row && row.payload).filter(Boolean) : [];
      },
      put(record) {
        return enqueue(async () => {
          await init();
          const { session } = requireContext();
          if (mirror) { try { await mirror.put(record); } catch (_) {} }
          await request('POST', `/rest/v1/${TABLE}`, {
            headers:{
              Authorization:`Bearer ${session.access_token}`,
              Prefer:'resolution=merge-duplicates,return=minimal',
            },
            body:encodeRecord(record),
          });
          return record;
        });
      },
      delete(id) {
        return enqueue(async () => {
          await init();
          const { session } = requireContext();
          if (mirror) { try { await mirror.delete(id); } catch (_) {} }
          await request('DELETE', `/rest/v1/${TABLE}?id=eq.${encodeURIComponent(String(id))}`, {
            headers:{ Authorization:`Bearer ${session.access_token}` },
          });
          return true;
        });
      },
    };
  }

  function setConfig(next) {
    const value = next && typeof next === 'object'
      ? { url:String(next.url || '').trim(), anonKey:String(next.anonKey || '').trim() }
      : null;
    config = value && value.url && value.anonKey ? value : null;
    if (config) writeStored(CONFIG_KEY, config);
    else removeStored(CONFIG_KEY);
    resetInit();
    notify();
    return config;
  }

  return Object.freeze({
    init,
    status,
    isConfigured,
    isActive,
    getConfig:() => config ? { url:config.url, anonKey:config.anonKey } : null,
    setConfig,
    signUp,
    signIn,
    signOut,
    createV8Adapter,
    subscribe(listener) {
      if (typeof listener === 'function') {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }
      return () => {};
    },
  });
});