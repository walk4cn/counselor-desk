/* Pure AI task governance helpers shared by browser, desktop, and tests. */
(function installCwbAiWorkflow(root) {
  'use strict';

  const SCHEMA_VERSION = 8;
  const PURPOSES = Object.freeze([
    'certificate_recognition',
    'work_summary',
    'notice_rewrite',
    'warning_assist',
    'student_summary',
    'student_followup',
    'talk_brief',
    'talk_note',
    'task_plan',
    'workday_actions',
    'academic_support',
    'care_followup',
    'record_completeness',
    'employment_coach',
    'knowledge_search',
    'organization_checklist',
    'competition_coach',
  ]);
  const SUGGESTION_STATUSES = Object.freeze([
    'draft', 'review', 'viewed', 'accepted', 'converted_task', 'converted_talk', 'converted_worklog', 'rejected',
  ]);
  const SUGGESTION_RISK_LEVELS = Object.freeze(['normal', 'attention', 'high', 'critical']);
  const SENSITIVE_CATEGORIES = Object.freeze(['identity', 'contact', 'psychology', 'discipline', 'aid', 'warning', 'focus', 'attachments']);
  const SOURCE_KINDS = Object.freeze(['record', 'local', 'web']);
  const SOURCE_VERIFICATION_STATES = Object.freeze(['verified', 'needs_review', 'error', 'not_applicable']);
  const text = value => String(value == null ? '' : value).trim();
  const clone = value => value == null || typeof value !== 'object'
    ? value
    : Array.isArray(value)
      ? value.map(clone)
      : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  const id = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  function localDay(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }

  function authorize(provider, purpose, audits, date) {
    const value = provider || {};
    const task = text(purpose);
    if (value.enabled === false) throw new Error('AI_PROVIDER_DISABLED');
    if (!PURPOSES.includes(task) || !(Array.isArray(value.allowedPurposes) && value.allowedPurposes.includes(task))) throw new Error('AI_PURPOSE_NOT_ALLOWED');
    const today = localDay(date || new Date());
    const used = (Array.isArray(audits) ? audits : []).filter(item => (
      item && item.purpose === task && item.status === 'completed' && localDay(item.created_at) === today
    )).length;
    const quota = Math.max(0, Number(value.dailyQuota) || 0);
    if (quota > 0 && used >= quota) throw new Error('AI_DAILY_QUOTA_EXCEEDED');
    return { purpose:task, used, remaining:quota > 0 ? quota - used : null };
  }

  function normalizeDraft(input) {
    const value = Object.assign({}, input || {});
    const at = new Date().toISOString();
    return {
      id:text(value.id) || id('ai_draft'),
      schema_version:SCHEMA_VERSION,
      kind:text(value.kind) || 'general',
      status:text(value.status) || 'draft',
      provider_id:text(value.provider_id),
      model:text(value.model),
      audit_id:text(value.audit_id),
      source_attachment_id:text(value.source_attachment_id),
      student_id:text(value.student_id),
      student_number:text(value.student_number),
      target_view:text(value.target_view),
      target_collection:text(value.target_collection),
      target_record_id:text(value.target_record_id),
      source_ids:Array.isArray(value.source_ids) ? value.source_ids.map(text).filter(Boolean).slice(0, 120) : [],
      context_scope:clone(value.context_scope && typeof value.context_scope === 'object' ? value.context_scope : {}),
      payload:clone(value.payload && typeof value.payload === 'object' ? value.payload : {}),
      created_at:text(value.created_at) || at,
      updated_at:at,
    };
  }

  function normalizeSource(input) {
    const value = Object.assign({}, input || {});
    const kind = SOURCE_KINDS.includes(text(value.kind)) ? text(value.kind) : 'record';
    const now = new Date().toISOString();
    const retrievedAt = text(value.retrieved_at) || now;
    const status = text(value.status) || 'available';
    const requestedVerificationStatus = SOURCE_VERIFICATION_STATES.includes(text(value.verification_status))
      ? text(value.verification_status)
      : kind === 'web'
        ? (status === 'needs_review' ? 'needs_review' : status === 'error' ? 'error' : 'verified')
        : 'not_applicable';
    const verificationStatus = kind === 'web' && !isPublicWebSourceUrl(value.url)
      ? 'needs_review'
      : requestedVerificationStatus;
    return {
      id:text(value.id) || id('ai_source'),
      schema_version:SCHEMA_VERSION,
      kind,
      collection:text(value.collection),
      record_id:text(value.record_id),
      student_id:text(value.student_id),
      title:text(value.title),
      url:text(value.url),
      excerpt:text(value.excerpt).slice(0, 4000),
      retrieved_at:retrievedAt,
      status,
      verification_status:verificationStatus,
      last_verified_at:text(value.last_verified_at) || (kind === 'web' && verificationStatus === 'verified' ? retrievedAt : ''),
      verification_error:text(value.verification_error).slice(0, 240),
      created_at:text(value.created_at) || now,
      updated_at:now,
    };
  }

  function sourceUsable(input) {
    const source = normalizeSource(input);
    return source.kind !== 'web' || (source.verification_status === 'verified' && source.status !== 'needs_review' && source.status !== 'error' && isPublicWebSourceUrl(source.url));
  }

  function isPublicWebSourceUrl(value) {
    let url;
    try { url = new URL(text(value)); } catch (_) { return false; }
    const hostname = text(url.hostname).replace(/^\[|\]$/g, '').toLowerCase().replace(/\.$/, '');
    if (url.protocol !== 'https:' || !hostname || url.username || url.password || url.port) return false;
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe80:')) return false;
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
      const parts = hostname.split('.').map(Number);
      if (parts.some(part => part > 255) || parts[0] === 0 || parts[0] === 10 || parts[0] === 127 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 169 && parts[1] === 254)) return false;
    }
    return true;
  }

  function normalizeConsent(input) {
    const value = Object.assign({}, input || {});
    const categories = Array.isArray(value.categories)
      ? value.categories.map(text).filter(category => SENSITIVE_CATEGORIES.includes(category))
      : [];
    const contextScope = value.context_scope && typeof value.context_scope === 'object'
      ? clone(value.context_scope)
      : {};
    return {
      id:text(value.id) || id('ai_consent'),
      schema_version:SCHEMA_VERSION,
      request_id:text(value.request_id),
      purpose:text(value.purpose) || 'general',
      scope:text(value.scope) || 'current',
      student_id:text(value.student_id),
      context_scope:contextScope,
      categories:[...new Set(categories)],
      fields:Array.isArray(value.fields) ? value.fields.map(text).filter(Boolean).slice(0, 80) : [],
      granted:value.granted === true,
      authorized_at:text(value.authorized_at) || (value.granted === true ? new Date().toISOString() : ''),
      expires_at:text(value.expires_at),
      used_at:text(value.used_at),
      created_at:text(value.created_at) || new Date().toISOString(),
      updated_at:new Date().toISOString(),
    };
  }

  function normalizeSuggestion(input) {
    const value = Object.assign({}, input || {});
    const status = SUGGESTION_STATUSES.includes(text(value.status)) ? text(value.status) : 'draft';
    const sourceIds = Array.isArray(value.source_ids) ? value.source_ids.map(text).filter(Boolean).slice(0, 120) : [];
    const categories = Array.isArray(value.sensitive_categories)
      ? value.sensitive_categories.map(text).filter(category => SENSITIVE_CATEGORIES.includes(category))
      : [];
    return {
      id:text(value.id) || id('ai_suggestion'),
      schema_version:SCHEMA_VERSION,
      kind:text(value.kind) || 'general',
      purpose:text(value.purpose) || 'work_summary',
      status,
      title:text(value.title) || 'AI 工作建议',
      summary:text(value.summary),
      payload:clone(value.payload && typeof value.payload === 'object' ? value.payload : {}),
      provider_id:text(value.provider_id),
      model:text(value.model),
      audit_id:text(value.audit_id),
      consent_id:text(value.consent_id),
      student_id:text(value.student_id),
      student_number:text(value.student_number),
      target_view:text(value.target_view),
      target_record_id:text(value.target_record_id),
      target_collection:text(value.target_collection),
      source_ids:[...new Set(sourceIds)],
      citations:Array.isArray(value.citations) ? value.citations.map(item => ({
        source_id:text(item && item.source_id),
        title:text(item && item.title),
        url:text(item && item.url),
        excerpt:text(item && item.excerpt).slice(0, 1000),
      })).filter(item => item.source_id || item.url || item.title).slice(0, 40) : [],
      sensitive_categories:[...new Set(categories)],
      risk_level:SUGGESTION_RISK_LEVELS.includes(text(value.risk_level)) ? text(value.risk_level) : 'normal',
      human_confirmed_at:text(value.human_confirmed_at),
      confirmation_method:text(value.confirmation_method),
      actions:Array.isArray(value.actions) ? value.actions.map(text).filter(Boolean).slice(0, 12) : [],
      context_scope:clone(value.context_scope && typeof value.context_scope === 'object' ? value.context_scope : {}),
      created_at:text(value.created_at) || new Date().toISOString(),
      updated_at:new Date().toISOString(),
    };
  }

  function suggestionRequiresExplicitConfirmation(input) {
    const suggestion = normalizeSuggestion(input);
    return suggestion.risk_level === 'high' || suggestion.risk_level === 'critical' || suggestion.sensitive_categories.length > 0;
  }

  function transitionSuggestion(input, nextStatus) {
    const current = normalizeSuggestion(input);
    const next = text(nextStatus);
    if (!SUGGESTION_STATUSES.includes(next)) throw new Error('AI_SUGGESTION_STATUS_INVALID');
    const allowed = {
      draft:['review', 'rejected'],
      review:['viewed', 'accepted', 'rejected'],
      viewed:['accepted', 'rejected'],
      accepted:['converted_task', 'converted_talk', 'converted_worklog'],
      converted_task:[], converted_talk:[], converted_worklog:[], rejected:[],
    };
    if (next !== current.status && !(allowed[current.status] || []).includes(next)) throw new Error('AI_SUGGESTION_TRANSITION_INVALID');
    return Object.assign({}, current, { status:next, updated_at:new Date().toISOString() });
  }

  function parseCertificateResponse(raw) {
    const summary = text(raw);
    const draft = { title:'', level:'', date:'', organizer:'', project:'', recipient:'', summary };
    if (!summary) return draft;
    try {
      const parsed = JSON.parse(summary.replace(/^```json\s*/i, '').replace(/\s*```$/i, ''));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return draft;
      ['title', 'level', 'date', 'organizer', 'project', 'recipient', 'summary'].forEach(key => {
        if (parsed[key] != null) draft[key] = text(parsed[key]);
      });
      if (!draft.summary) draft.summary = summary;
    } catch (_) {}
    return draft;
  }

  root.CWBAIWorkflow = Object.freeze({
    schemaVersion:SCHEMA_VERSION,
    purposes:PURPOSES,
    authorize,
    normalizeDraft,
    normalizeSource,
    normalizeConsent,
    normalizeSuggestion,
    suggestionRiskLevels:SUGGESTION_RISK_LEVELS,
    suggestionRequiresExplicitConfirmation,
    transitionSuggestion,
    suggestionStatuses:SUGGESTION_STATUSES,
    sensitiveCategories:SENSITIVE_CATEGORIES,
    sourceKinds:SOURCE_KINDS,
    sourceVerificationStates:SOURCE_VERIFICATION_STATES,
    sourceUsable,
    isPublicWebSourceUrl,
    parseCertificateResponse,
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
