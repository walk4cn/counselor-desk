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
  const AI_PURPOSES = new Set(['certificate_recognition', 'work_summary', 'notice_rewrite', 'warning_assist']);
  const SENSITIVE_KEY = /(^name$|student.?number|student.?no|学号|full.?name|student.?name|姓名|phone|mobile|电话|手机号|id.?card|身份证|address|地址|parent|家长|psych|心理|crisis|危机|discipline|处分|grant|资助|photo|照片|focus|重点学生|warning|预警|reason|原因)/i;
  const SECRET_KEY = /(?:api.?key|secret|token|password|密钥|口令)/i;

  function clone(value) {
    if (value == null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(clone);
    const output = {};
    Object.keys(value).forEach(key => { output[key] = clone(value[key]); });
    return output;
  }

  function redact(value) {
    if (Array.isArray(value)) return value.map(redact);
    if (typeof value === 'string') return value.replace(/\b1[3-9]\d{9}\b/g, '[已脱敏]').replace(/\b\d{17}[\dXx]\b/g, '[已脱敏]');
    if (!value || typeof value !== 'object') return value;
    const output = {};
    Object.keys(value).forEach(key => {
      if (SENSITIVE_KEY.test(key) || SECRET_KEY.test(key)) output[key] = '[已脱敏]';
      else output[key] = redact(value[key]);
    });
    return output;
  }

  function providerCatalog() {
    return PROVIDERS.map(clone);
  }

  function normalizeBaseUrl(value) {
    const text = String(value || '').trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(text)) throw new Error('AI_PROVIDER_BASE_URL_INVALID');
    try { return new URL(text).toString().replace(/\/$/, ''); }
    catch (_) { throw new Error('AI_PROVIDER_BASE_URL_INVALID'); }
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
    return {
      purpose:String(value.purpose || 'general'),
      dateRange:value.dateRange ? clone(value.dateRange) : null,
      sensitive:value.includeSensitive === true,
      records:value.includeSensitive === true ? clone(records) : redact(records),
      generated_at:new Date().toISOString(),
    };
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

  function buildChatRequest(configInput, messages, options) {
    const config = validateProviderConfig(configInput);
    const opts = Object.assign({ temperature:0.2, max_tokens:2000 }, options || {});
    const normalizedMessages = (Array.isArray(messages) ? messages : []).map(message => ({
      role:message && message.role === 'assistant' ? 'assistant' : 'user',
      content:normalizeMessageContent(message && message.content),
    }));
    if (config.protocol === 'anthropic') {
      return {
        url:`${config.baseUrl}/messages`,
        headers:{ 'content-type':'application/json', 'anthropic-version':'2023-06-01' },
        body:{ model:config.model, max_tokens:opts.max_tokens, temperature:opts.temperature, messages:normalizedMessages },
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
    if (choice && choice.message && choice.message.content != null) return String(choice.message.content);
    const candidate = payload.candidates && payload.candidates[0];
    if (candidate && candidate.content && Array.isArray(candidate.content.parts)) return candidate.content.parts.map(part => part.text || '').join('');
    if (payload.content && Array.isArray(payload.content)) return payload.content.map(part => part.text || '').join('');
    return typeof payload.output_text === 'string' ? payload.output_text : '';
  }

  async function sendChat(configInput, messages, options) {
    if (typeof fetch !== 'function') throw new Error('AI_FETCH_UNAVAILABLE');
    const config = validateProviderConfig(configInput);
    const request = buildChatRequest(config, messages, options);
    const apiKey = String((options && options.apiKey) || '').trim();
    if (!apiKey) throw new Error('AI_API_KEY_REQUIRED');
    const headers = Object.assign({}, request.headers);
    if (config.protocol === 'anthropic') headers['x-api-key'] = apiKey;
    else headers.authorization = `Bearer ${apiKey}`;
    const response = await fetch(request.url, { method:'POST', headers, body:JSON.stringify(request.body), signal:options && options.signal });
    let payload = null;
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) {
      const detail = payload && (payload.error && (payload.error.message || payload.error.type) || payload.message);
      throw new Error(`AI_PROVIDER_REQUEST_FAILED:${response.status}:${detail || 'unknown'}`);
    }
    const text = extractResponseText(payload);
    if (!text) throw new Error('AI_PROVIDER_EMPTY_RESPONSE');
    return { text, provider:keyOf(config), model:config.model, received_at:new Date().toISOString() };
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
      sensitiveAuthorized:value.sensitiveAuthorized === true,
      recordCount:Math.max(0, Number(value.recordCount) || 0),
      status:String(value.status || 'completed'),
      error:String(value.error || ''),
      created_at:new Date().toISOString(),
      schema_version:8,
    };
  }

  root.CWBAI = {
    schemaVersion:8,
    providerCatalog,
    redact,
    buildContext,
    buildVisionMessage,
    normalizeProviderConfig,
    validateProviderConfig,
    buildChatRequest,
    extractResponseText,
    sendChat,
    createAuditEntry,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
