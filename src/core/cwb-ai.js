/*
 * Local-first AI governance helpers.
 * This file deliberately has no DOM or storage dependency so it can be used by
 * the browser, the Electron renderer, tests, and future provider adapters.
 */
(function installCwbAi(root) {
  'use strict';

  const PROVIDERS = [
    { key:'openai', name:'OpenAI', protocol:'openai-compatible', baseUrl:'https://api.openai.com/v1' },
    { key:'deepseek', name:'DeepSeek', protocol:'openai-compatible', baseUrl:'https://api.deepseek.com/v1' },
    { key:'gemini', name:'Gemini', protocol:'gemini', baseUrl:'https://generativelanguage.googleapis.com/v1beta/openai' },
    { key:'claude', name:'Claude', protocol:'anthropic', baseUrl:'https://api.anthropic.com/v1' },
    { key:'qwen', name:'通义千问', protocol:'openai-compatible', baseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1' },
    { key:'zhipu', name:'智谱', protocol:'openai-compatible', baseUrl:'https://open.bigmodel.cn/api/paas/v4' },
    { key:'doubao', name:'豆包', protocol:'openai-compatible', baseUrl:'https://ark.cn-beijing.volces.com/api/v3' },
    { key:'kimi', name:'Kimi', protocol:'openai-compatible', baseUrl:'https://api.moonshot.cn/v1' },
  ];
  const PROVIDER_BY_KEY = new Map(PROVIDERS.map(item => [item.key, item]));
  const AI_PURPOSES = new Set([
    'certificate_recognition', 'work_summary', 'notice_rewrite', 'warning_assist',
    'student_summary', 'student_followup', 'talk_brief', 'talk_note', 'task_plan',
    'workday_actions', 'academic_support', 'care_followup', 'record_completeness',
    'employment_coach', 'knowledge_search', 'organization_checklist', 'competition_coach',
  ]);
  const SENSITIVE_CATEGORIES = Object.freeze(['identity', 'contact', 'psychology', 'discipline', 'aid', 'warning', 'focus', 'attachments']);
  const SENSITIVE_GROUPS = Object.freeze({
    identity:/^(?:name|full_name|student_name|student_number|student_no|student_id_number|id_card|身份证|姓名|学号|birthday|birth_date|gender|政治面貌)$/i,
    contact:/(?:phone|mobile|电话|手机号|email|qq|address|地址|parent|家长|emergency|紧急联系人|家庭)/i,
    psychology:/(?:psych|心理|mental|scale|量表|concern|困扰|diagnos|诊断|危机)/i,
    discipline:/(?:discipline|处分|违纪|惩处|punish)/i,
    aid:/(?:grant|aid|资助|助学|困难认定|金额|amount)/i,
    warning:/(?:warning|预警|failed|挂科|risk|风险|level|等级)/i,
    focus:/(?:focus|重点学生|重点关注|关注等级)/i,
    attachments:/(?:attachment|附件|photo|照片|document|文件)/i,
  });
  const SENSITIVE_KEY = /(^name$|student.?number|student.?no|学号|full.?name|student.?name|姓名|phone|mobile|电话|手机号|id.?card|身份证|address|地址|parent|家长|psych|心理|crisis|危机|discipline|处分|grant|资助|photo|照片|focus|重点学生|warning|预警|reason|原因)/i;
  const SECRET_KEY = /(?:api.?key|secret|token|password|密钥|口令)/i;
  const DEFAULT_REQUEST_TIMEOUT_MS = 45 * 1000;

  function clone(value) {
    if (value == null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(clone);
    const output = {};
    Object.keys(value).forEach(key => { output[key] = clone(value[key]); });
    return output;
  }

  function sensitiveCategoryForKey(key) {
    const name = String(key || '');
    for (const category of SENSITIVE_CATEGORIES) if (SENSITIVE_GROUPS[category].test(name)) return category;
    return SENSITIVE_KEY.test(name) ? 'identity' : '';
  }

  function redact(value, options, inheritedAuthorization, inheritedCategory) {
    const opts = options || {};
    const authorizedCategories = new Set(Array.isArray(opts.categories) ? opts.categories : []);
    const authorizedFields = new Set(Array.isArray(opts.fields) ? opts.fields : []);
    if (Array.isArray(value)) return value.map(item => redact(item, opts, inheritedAuthorization, inheritedCategory));
    if (typeof value === 'string') {
      return inheritedAuthorization
        ? value
        : value.replace(/\b1[3-9]\d{9}\b/g, '[已脱敏]').replace(/\b\d{17}[\dXx]\b/g, '[已脱敏]');
    }
    if (!value || typeof value !== 'object') return value;
    const output = {};
    Object.keys(value).forEach(key => {
      const category = sensitiveCategoryForKey(key);
      const authorized = authorizedFields.has(key) || (category ? authorizedCategories.has(category) : inheritedCategory && authorizedCategories.has(inheritedCategory));
      if (SECRET_KEY.test(key) || ((SENSITIVE_KEY.test(key) || category) && !authorized)) output[key] = '[已脱敏]';
      else if (value[key] && typeof value[key] === 'object') output[key] = redact(value[key], opts, false, category && authorizedCategories.has(category) ? category : inheritedCategory);
      else output[key] = redact(value[key], opts, inheritedAuthorization || authorized === true, inheritedCategory);
    });
    return output;
  }

  function providerCatalog() {
    return PROVIDERS.map(clone);
  }

  function isLocalHostname(value) {
    const hostname = String(value || '').toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  }

  function normalizeBaseUrl(value) {
    const text = String(value || '').trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(text)) throw new Error('AI_PROVIDER_BASE_URL_INVALID');
    try {
      const url = new URL(text);
      if (url.protocol === 'http:' && !isLocalHostname(url.hostname)) throw new Error('AI_PROVIDER_BASE_URL_INVALID');
      return url.toString().replace(/\/$/, '');
    }
    catch (_) { throw new Error('AI_PROVIDER_BASE_URL_INVALID'); }
  }

  function normalizeRelayUrl(value) {
    const text = String(value || '').trim().replace(/\/+$/, '');
    if (!text) return '';
    if (text.startsWith('/') && !text.startsWith('//')) {
      if (!/\/api\/ai\/chat$/.test(text)) throw new Error('AI_PROVIDER_RELAY_URL_INVALID');
      return text;
    }
    if (!/^https?:\/\//i.test(text)) throw new Error('AI_PROVIDER_RELAY_URL_INVALID');
    try {
      const url = new URL(text);
      if (!/\/api\/ai\/chat$/.test(url.pathname) || (url.protocol === 'http:' && !isLocalHostname(url.hostname))) throw new Error('AI_PROVIDER_RELAY_URL_INVALID');
      return url.toString().replace(/\/$/, '');
    }
    catch (_) { throw new Error('AI_PROVIDER_RELAY_URL_INVALID'); }
  }

  function normalizeSourceRelayUrl(value) {
    const text = String(value || '').trim().replace(/\/+$/, '');
    if (!text) return '';
    if (text.startsWith('/') && !text.startsWith('//')) {
      if (!/\/api\/ai\/source$/.test(text)) throw new Error('AI_PROVIDER_RELAY_URL_INVALID');
      return text;
    }
    if (!/^https?:\/\//i.test(text)) throw new Error('AI_PROVIDER_RELAY_URL_INVALID');
    try {
      const url = new URL(text);
      if (!/\/api\/ai\/source$/.test(url.pathname) || (url.protocol === 'http:' && !isLocalHostname(url.hostname))) throw new Error('AI_PROVIDER_RELAY_URL_INVALID');
      return url.toString().replace(/\/$/, '');
    } catch (_) { throw new Error('AI_PROVIDER_RELAY_URL_INVALID'); }
  }

  function normalizeProviderConfig(input) {
    const value = Object.assign({}, input || {});
    const catalog = PROVIDER_BY_KEY.get(String(value.key || ''));
    const key = String(value.key || 'custom');
    const baseUrl = normalizeBaseUrl(value.baseUrl || (catalog && catalog.baseUrl));
    return {
      id:String(value.id || `${key}_${Date.now()}`),
      key,
      name:String(value.name || (catalog && catalog.name) || '自定义模型').trim(),
      protocol:String(value.protocol || (catalog && catalog.protocol) || 'openai-compatible'),
      baseUrl,
      relayUrl:normalizeRelayUrl(value.relayUrl),
      model:String(value.model || '').trim(),
      enabled:value.enabled !== false,
      allowedPurposes:Array.isArray(value.allowedPurposes) ? value.allowedPurposes.map(String).filter(purpose => AI_PURPOSES.has(purpose)) : [],
      supportsVision:value.supportsVision === true,
      dailyQuota:Math.max(0, Number(value.dailyQuota) || 0),
      created_at:String(value.created_at || new Date().toISOString()),
      updated_at:new Date().toISOString(),
    };
  }

  function validateProviderConfig(input) {
    const config = normalizeProviderConfig(input);
    if (!config.model) throw new Error('AI_PROVIDER_MODEL_REQUIRED');
    if (!['openai-compatible', 'anthropic', 'gemini'].includes(config.protocol)) throw new Error('AI_PROVIDER_PROTOCOL_UNSUPPORTED');
    return config;
  }

  function buildContext(input) {
    const value = Object.assign({ purpose:'general', includeSensitive:false, records:[] }, input || {});
    const records = Array.isArray(value.records) ? value.records : [];
    const requestedCategories = Array.isArray(value.sensitiveCategories)
      ? value.sensitiveCategories.filter(category => SENSITIVE_CATEGORIES.includes(String(category)))
      : value.includeSensitive === true ? SENSITIVE_CATEGORIES.slice() : [];
    const requestedFields = Array.isArray(value.sensitiveFields) ? value.sensitiveFields.map(String).filter(Boolean).slice(0, 120) : [];
    return {
      purpose:String(value.purpose || 'general'),
      student_id:String(value.student_id || ''),
      page_view:String(value.page_view || ''),
      target_view:String(value.target_view || ''),
      target_collection:String(value.target_collection || ''),
      target_record_id:String(value.target_record_id || ''),
      scope:clone(value.scope || null),
      dateRange:value.dateRange ? clone(value.dateRange) : null,
      sensitive:requestedCategories.length > 0 || requestedFields.length > 0,
      authorizedCategories:requestedCategories,
      authorizedFields:requestedFields,
      records:redact(records, { categories:requestedCategories, fields:requestedFields }),
      generated_at:new Date().toISOString(),
    };
  }

  function isPrivateHostname(hostname) {
    const host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
    if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true;
    if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) return true;
    const parts = host.split('.');
    if (parts.length !== 4 || parts.some(part => !/^\d+$/.test(part))) return false;
    const octets = parts.map(Number);
    if (octets.some(part => part < 0 || part > 255)) return true;
    return octets[0] === 10 || octets[0] === 127 || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
      || (octets[0] === 192 && octets[1] === 168) || (octets[0] === 169 && octets[1] === 254);
  }

  function normalizePublicSourceUrl(value) {
    const raw = String(value || '').trim();
    if (!/^https:\/\//i.test(raw)) throw new Error('AI_SOURCE_URL_HTTPS_REQUIRED');
    let url;
    try { url = new URL(raw); } catch (_) { throw new Error('AI_SOURCE_URL_INVALID'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port || isPrivateHostname(url.hostname)) throw new Error('AI_SOURCE_URL_NOT_PUBLIC');
    url.hash = '';
    return url.toString();
  }

  function defaultSourceRelayUrl() {
    const location = root.location;
    if (!location || !/^https?:$/i.test(String(location.protocol || ''))) return '';
    const hostname = String(location.hostname || '').toLowerCase();
    if (!['127.0.0.1', 'localhost', '::1'].includes(hostname)) return '';
    return String(location.origin || '').replace(/\/$/, '') + '/api/ai/source';
  }

  function resolveSourceRelayUrl(options) {
    const configured = options && options.relayUrl != null ? options.relayUrl : root.CWB_AI_RELAY_SOURCE_URL || '';
    if (configured) return normalizeSourceRelayUrl(configured);
    return defaultSourceRelayUrl();
  }

  async function fetchPublicSource(input, options) {
    const value = typeof input === 'string' ? { url:input } : Object.assign({}, input || {});
    const url = normalizePublicSourceUrl(value.url);
    const opts = Object.assign({ maxBytes:512 * 1024, timeoutMs:8000 }, options || {});
    const requestScope = createAbortScope(opts.signal, opts.timeoutMs);
    const sourceRelayUrl = resolveSourceRelayUrl(options);
    try {
      if (sourceRelayUrl) {
        const relayHeaders = { 'content-type':'application/json' };
        const relayToken = String((options && options.relayToken) || '').trim();
        if (relayToken) relayHeaders['x-ai-relay-token'] = relayToken;
        const relayResponse = await callFetch(sourceRelayUrl, {
          method:'POST', headers:relayHeaders, body:JSON.stringify({ url, title:value.title || '' }),
          signal:requestScope.signal, redirect:'error',
        });
        let relayPayload = null;
        try { relayPayload = await relayResponse.json(); } catch (_) {}
        if (!relayResponse.ok) {
          const safeCode = safeResponseErrorCode(relayPayload);
          throw new Error(safeCode || 'AI_SOURCE_FETCH_FAILED');
        }
        if (relayPayload && relayPayload.source) {
          const source = relayPayload.source;
          if (normalizePublicSourceUrl(source.url || url) !== url) throw new Error('AI_SOURCE_FETCH_INVALID_RESPONSE');
          return Object.assign({}, source, {
            url,
            status:source.status || 'available',
            verification_status:'verified',
            last_verified_at:source.last_verified_at || source.retrieved_at || new Date().toISOString(),
            verification_error:'',
          });
        }
        throw new Error('AI_SOURCE_FETCH_INVALID_RESPONSE');
      }
      if (typeof fetch !== 'function') throw new Error('AI_SOURCE_FETCH_UNAVAILABLE');
      const response = await fetch(url, { method:'GET', redirect:'error', signal:requestScope.signal, headers:{ accept:'text/html,text/plain,application/json' } });
      if (!response.ok) throw new Error('AI_SOURCE_FETCH_FAILED:' + response.status);
      const type = String(response.headers && response.headers.get && response.headers.get('content-type') || '').toLowerCase();
      if (type && !/(?:text\/html|text\/plain|application\/json|application\/xml)/i.test(type)) throw new Error('AI_SOURCE_CONTENT_TYPE_UNSUPPORTED');
      const length = Number(response.headers && response.headers.get && response.headers.get('content-length') || 0);
      if (length > opts.maxBytes) throw new Error('AI_SOURCE_RESPONSE_TOO_LARGE');
      const text = await response.text();
      if (text.length > opts.maxBytes) throw new Error('AI_SOURCE_RESPONSE_TOO_LARGE');
      const title = String(value.title || (text.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || url).replace(/\s+/g, ' ').trim().slice(0, 240);
      const excerpt = text.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000);
      const retrievedAt = new Date().toISOString();
      return { url, title, excerpt, retrieved_at:retrievedAt, status:'available', verification_status:'verified', last_verified_at:retrievedAt, verification_error:'' };
    } catch (error) {
      if (requestScope.timedOut()) throw new Error('AI_SOURCE_FETCH_TIMEOUT');
      if (error && (error.name === 'AbortError' || error.message === 'AI_PROVIDER_REQUEST_ABORTED')) throw new Error('AI_SOURCE_FETCH_ABORTED');
      throw error;
    } finally {
      requestScope.dispose();
    }
  }

  function buildVisionMessage(prompt, dataUrl) {
    const source = String(dataUrl || '').trim();
    if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(source)) throw new Error('AI_VISION_IMAGE_INVALID');
    return {
      role:'user',
      content:[
        { type:'text', text:String(prompt || '请识别图片中的结构化信息') },
        { type:'image_url', image_url:{ url:source } },
      ],
    };
  }

  function normalizeMessageContent(content) {
    if (Array.isArray(content)) return content.map(part => clone(part));
    return String(content == null ? '' : content);
  }

  function messageText(content) {
    if (Array.isArray(content)) return content.map(part => part && part.text || '').join('');
    return String(content == null ? '' : content);
  }

  function buildChatRequest(configInput, messages, options) {
    const config = validateProviderConfig(configInput);
    const opts = Object.assign({ temperature:0.2, max_tokens:2000 }, options || {});
    const normalizedMessages = (Array.isArray(messages) ? messages : []).map(message => ({
      role:message && ['system', 'assistant', 'user'].includes(message.role) ? message.role : 'user',
      content:normalizeMessageContent(message && message.content),
    }));
    if (config.protocol === 'anthropic') {
      const system = normalizedMessages.filter(message => message.role === 'system').map(message => messageText(message.content)).filter(Boolean).join('\n');
      return {
        url:`${config.baseUrl}/messages`,
        headers:{ 'content-type':'application/json', 'anthropic-version':'2023-06-01' },
        body:Object.assign({ model:config.model, max_tokens:opts.max_tokens, temperature:opts.temperature, messages:normalizedMessages.filter(message => message.role !== 'system') }, system ? { system } : {}),
      };
    }
    if (config.protocol === 'gemini') {
      return {
        url:`${config.baseUrl}/chat/completions`,
        headers:{ 'content-type':'application/json' },
        body:{ model:config.model, messages:normalizedMessages, temperature:opts.temperature, max_tokens:opts.max_tokens },
      };
    }
    return {
      url:`${config.baseUrl}/chat/completions`,
      headers:{ 'content-type':'application/json' },
      body:{ model:config.model, messages:normalizedMessages, temperature:opts.temperature, max_tokens:opts.max_tokens },
    };
  }

  function extractResponseText(payload) {
    if (!payload) return '';
    const choice = payload.choices && payload.choices[0];
    if (choice && choice.message && choice.message.content != null) return messageText(choice.message.content);
    const candidate = payload.candidates && payload.candidates[0];
    if (candidate && candidate.content && Array.isArray(candidate.content.parts)) return candidate.content.parts.map(part => part.text || '').join('');
    if (payload.content && Array.isArray(payload.content)) return payload.content.map(part => part.text || '').join('');
    return typeof payload.output_text === 'string' ? payload.output_text : '';
  }

  function defaultRelayUrl() {
    const location = root.location;
    if (!location || !/^https?:$/i.test(String(location.protocol || ''))) return '';
    const hostname = String(location.hostname || '').toLowerCase();
    if (!['127.0.0.1', 'localhost', '::1'].includes(hostname)) return '';
    return `${String(location.origin || '').replace(/\/$/, '')}/api/ai/chat`;
  }

  function resolveRelayUrl(config, options) {
    if (options && options.useRelay === false) return '';
    const configured = options && options.relayUrl != null ? options.relayUrl : (config && config.relayUrl) || root.CWB_AI_RELAY_URL || '';
    if (configured) return normalizeRelayUrl(configured);
    return config && /^https:$/i.test(new URL(config.baseUrl).protocol) ? defaultRelayUrl() : '';
  }

  async function callFetch(url, options) {
    try { return await fetch(url, options); }
    catch (error) {
      if (error && error.name === 'AbortError') throw new Error('AI_PROVIDER_REQUEST_ABORTED');
      throw new Error('AI_PROVIDER_NETWORK_UNAVAILABLE');
    }
  }

  function createAbortScope(externalSignal, timeoutMs) {
    if (typeof AbortController !== 'function') return { signal:externalSignal, timedOut:() => false, dispose:() => {} };
    const controller = new AbortController();
    let timedOut = false;
    const onAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else if (typeof externalSignal.addEventListener === 'function') externalSignal.addEventListener('abort', onAbort, { once:true });
    }
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, Math.max(1000, Number(timeoutMs) || DEFAULT_REQUEST_TIMEOUT_MS));
    return {
      signal:controller.signal,
      timedOut:() => timedOut,
      dispose:() => {
        clearTimeout(timer);
        if (externalSignal && typeof externalSignal.removeEventListener === 'function') externalSignal.removeEventListener('abort', onAbort);
      },
    };
  }

  function safeResponseErrorCode(payload) {
    const code = payload && payload.error && payload.error.code;
    return typeof code === 'string' && /^(?:AI_RELAY|AI_PROVIDER)_[A-Z0-9_]+$/.test(code) ? code : '';
  }

  function safeErrorCode(error) {
    const raw = String(error && error.message || error || '').trim();
    if (/^AI_PROVIDER_REQUEST_FAILED:\d+(?::AI_(?:RELAY|PROVIDER)_[A-Z0-9_]+)?$/.test(raw)) return raw.slice(0, 160);
    if (/^AI_[A-Z0-9_]+$/.test(raw)) return raw.slice(0, 120);
    if (/^(?:CERTIFICATE|WORK_SUMMARY)_[A-Z0-9_]+$/.test(raw)) return raw.slice(0, 120);
    return raw ? 'AI_REQUEST_FAILED' : '';
  }

  async function sendChat(configInput, messages, options) {
    if (typeof fetch !== 'function') throw new Error('AI_FETCH_UNAVAILABLE');
    const config = validateProviderConfig(configInput);
    const request = buildChatRequest(config, messages, options);
    const apiKey = String((options && options.apiKey) || '').trim();
    if (!apiKey) throw new Error('AI_API_KEY_REQUIRED');
    const relayUrl = resolveRelayUrl(config, options);
    const requestScope = createAbortScope(options && options.signal, options && options.timeoutMs);
    try {
      let response;
      if (relayUrl) {
        const relayHeaders = { 'content-type':'application/json' };
        const relayToken = String((options && options.relayToken) || '').trim();
        if (relayToken) relayHeaders['x-ai-relay-token'] = relayToken;
        response = await callFetch(relayUrl, {
          method:'POST',
          headers:relayHeaders,
          body:JSON.stringify({ url:request.url, protocol:config.protocol, apiKey, body:request.body }),
          signal:requestScope.signal,
          redirect:'error',
        });
      } else {
        const headers = Object.assign({}, request.headers);
        if (config.protocol === 'anthropic') headers['x-api-key'] = apiKey;
        else headers.authorization = `Bearer ${apiKey}`;
        response = await callFetch(request.url, { method:'POST', headers, body:JSON.stringify(request.body), signal:requestScope.signal, redirect:'error' });
      }
      let payload = null;
      try { payload = await response.json(); } catch (_) {}
      if (!response.ok) {
        const safeCode = safeResponseErrorCode(payload);
        throw new Error(`AI_PROVIDER_REQUEST_FAILED:${response.status}${safeCode ? `:${safeCode}` : ''}`);
      }
      const text = extractResponseText(payload);
      if (!text) throw new Error('AI_PROVIDER_EMPTY_RESPONSE');
      return { text, provider:keyOf(config), model:config.model, received_at:new Date().toISOString() };
    } catch (error) {
      if (requestScope.timedOut()) throw new Error('AI_PROVIDER_REQUEST_TIMEOUT');
      throw error;
    } finally {
      requestScope.dispose();
    }
  }

  function keyOf(config) { return String(config && config.key || 'custom'); }

  function createAuditEntry(input) {
    const value = input || {};
    return {
      id:`ai_audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      action:String(value.action || 'request'),
      purpose:String(value.purpose || 'general'),
      provider:String(value.provider || 'custom'),
      model:String(value.model || ''),
      sensitiveRequested:value.sensitiveRequested === true || value.sensitiveAuthorized === true,
      sensitiveAuthorized:value.sensitiveAuthorized === true,
      recordCount:Math.max(0, Number(value.recordCount) || 0),
      sourceCount:Math.max(0, Number(value.sourceCount) || 0),
      student_id:String(value.student_id || ''),
      consent_id:String(value.consent_id || ''),
      target_view:String(value.target_view || ''),
      target_collection:String(value.target_collection || ''),
      target_record_id:String(value.target_record_id || ''),
      status:String(value.status || 'completed'),
      error:safeErrorCode(value.error),
      created_at:new Date().toISOString(),
      schema_version:8,
    };
  }

  root.CWBAI = {
    schemaVersion:8,
    purposes:Object.freeze([...AI_PURPOSES]),
    sensitiveCategories:SENSITIVE_CATEGORIES,
    providerCatalog,
    redact,
    sensitiveCategoryForKey,
    buildContext,
    normalizePublicSourceUrl,
    normalizeSourceRelayUrl,
    fetchPublicSource,
    revalidatePublicSource:async (input, options) => {
      const value = typeof input === 'string' ? { url:input } : Object.assign({}, input || {});
      const source = await fetchPublicSource({ url:value.url, title:value.title || '' }, options);
      return Object.assign({}, source, { id:String(value.id || ''), kind:'web', verification_status:'verified', last_verified_at:source.retrieved_at, verification_error:'' });
    },
    buildVisionMessage,
    normalizeRelayUrl,
    normalizeProviderConfig,
    validateProviderConfig,
    buildChatRequest,
    resolveRelayUrl,
    extractResponseText,
    safeErrorCode,
    sendChat,
    createAuditEntry,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
