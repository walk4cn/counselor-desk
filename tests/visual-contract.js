const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.match(html, /\.save-status\{/);
assert.match(html, /\.student-table-wrap\[data-windowed="true"\]/);
assert.match(html, /\.schedule-panel\{/);
assert.match(html, /\.grade-trend\{/);
assert.match(html, /@media \(max-width:900px\)/);
assert.match(html, /@media \(max-width:480px\)/);
assert.match(html, /position:sticky;top:0;z-index:60/);
assert.match(html, /content-visibility:auto/);
console.log('PASS visual-contract');
