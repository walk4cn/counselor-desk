/* Shared collection manifest for browser, portable, desktop, and migration paths. */
(function installCwbCollections(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = { CWBCollections: api };
  if (root) root.CWBCollections = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCwbCollections() {
  'use strict';

  const canonical = Object.freeze([
    'students', 'tasks', 'talks', 'stay', 'leave', 'honor', 'orgs', 'party', 'rewards', 'activities',
    'grades', 'worklogs', 'pleave', 'attend', 'node', 'warn', 'help', 'grant', 'focus', 'psych',
    'graduate', 'policy', 'material', 'comp', 'tpl', 'learning_materials', 'learning_notes', 'learning_sessions',
  ]);
  const custom = Object.freeze([
    'v4_positions', 'v4_party_cases', 'v4_files', 'v4_employment_resources', 'v4_employment_intents',
    'v4_employment_contacts', 'v4_ai_providers', 'v4_ai_audit', 'v4_assessments', 'v4_academic_terms',
    'v4_disciplines', 'v4_aid_records', 'v4_ai_drafts', 'v4_test_snapshots',
  ]);
  const logical = Object.freeze([...canonical, ...custom]);
  const phoneSync = Object.freeze([...canonical, ...custom]);
  const auxiliaryDesktop = Object.freeze(['attachments', 'import_jobs', 'audit_log', 'meta', 'records_crisis_cases']);
  const customSet = new Set(custom);

  function isCustom(key) { return customSet.has(String(key || '')); }
  function logicalPath(key) { return isCustom(key) ? `custom.${key}` : String(key || ''); }
  function desktopName(key) {
    const value = String(key || '');
    return isCustom(value) ? `records_custom_${value}` : `records_${value}`;
  }
  function storagePaths() {
    return Object.freeze(Object.fromEntries(logical.map(key => [desktopName(key), logicalPath(key)])));
  }

  return Object.freeze({
    schemaVersion: 8,
    canonical,
    custom,
    logical,
    workspace: logical,
    backup: logical,
    sync: phoneSync,
    phoneSync,
    auxiliaryDesktop,
    desktopCollections: Object.freeze([...logical.map(desktopName), ...auxiliaryDesktop]),
    isCustom,
    logicalPath,
    desktopName,
    storagePaths,
  });
});
