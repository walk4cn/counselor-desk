/* Pure AI task governance helpers shared by browser, desktop, and tests. */
(function installCwbAiWorkflow(root) {
  'use strict';

  const SCHEMA_VERSION = 8;
  const PURPOSES = Object.freeze([
    'certificate_recognition',
    'work_summary',
    'notice_rewrite',
    'warning_assist',
  ]);
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
      audit_id:text(value.audit_id),
      source_attachment_id:text(value.source_attachment_id),
      student_id:text(value.student_id),
      student_number:text(value.student_number),
      payload:clone(value.payload && typeof value.payload === 'object' ? value.payload : {}),
      created_at:text(value.created_at) || at,
      updated_at:at,
    };
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
    parseCertificateResponse,
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
