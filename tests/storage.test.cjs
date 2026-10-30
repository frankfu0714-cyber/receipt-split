const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');
const build = mkdtempSync(join(tmpdir(), 'receipt-storage-test-'));
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', 'lib/storage.ts', 'lib/types.ts', 'lib/colors.ts', '--outDir', build, '--module', 'commonjs', '--target', 'es2020', '--skipLibCheck']);
const storage = require(join(build, 'storage.js'));
process.on('exit', () => rmSync(build, { recursive: true, force: true }));
const HISTORY = 'receipt-split:history';
const DRAFT = 'receipt-split:current-draft';
const receipt = { id: 'r', date: '2026-10-30', items: [{ id: 'i', name: 'Food', price: 12, assignedTo: ['a'], shares: { a: 2 } }], people: [{ id: 'a', name: 'A', color: '#fff' }], tax: 1, tip: 0, total: 13, imageDataUrl: 'x'.repeat(5000) };
function mock(limit, initial = {}) {
  const data = new Map(Object.entries(initial));
  global.window = {};
  global.localStorage = {
    getItem: key => data.get(key) ?? null,
    removeItem: key => data.delete(key),
    setItem(key, value) {
      const next = new Map(data).set(key, value);
      if ([...next.values()].reduce((n, s) => n + s.length, 0) > limit) throw new DOMException('Full', 'QuotaExceededError');
      data.set(key, value);
    },
  };
  return data;
}
test('normal snapshot retains photo', () => {
  mock(100000);
  assert.equal(storage.saveToHistory(receipt).photoOmitted, false);
  assert.deepEqual(storage.loadHistory(), [receipt]);
});
test('oversized snapshot saves every field except photo', () => {
  mock(2000);
  assert.equal(storage.saveToHistory(receipt).photoOmitted, true);
  const { imageDataUrl, ...expected } = receipt;
  assert.deepEqual(storage.loadHistory(), [expected]);
});
test('draft compacts legacy photos without losing snapshots', () => {
  const old = JSON.stringify([{ ...receipt, id: 'older' }]);
  mock(old.length + 10, { [HISTORY]: old });
  assert.equal(storage.saveDraft(receipt).photoOmitted, true);
  assert.equal(storage.loadHistory()[0].id, 'older');
  assert.equal(storage.loadHistory()[0].imageDataUrl, undefined);
  assert.deepEqual(storage.loadHistory()[0].items, receipt.items);
  assert.deepEqual(storage.loadDraft().items, receipt.items);
});
test('history compacts legacy draft and preserves older receipts', () => {
  mock(5400, { [DRAFT]: JSON.stringify(receipt), [HISTORY]: JSON.stringify([{...receipt, imageDataUrl: undefined, id:'old'}]) });
  storage.saveToHistory(receipt);
  assert.deepEqual(storage.loadHistory().map(r => r.id), ['r', 'old']);
  assert.deepEqual(storage.loadDraft().items, receipt.items);
  assert.equal(storage.loadDraft().imageDataUrl, undefined);
});
test('unavailable storage and genuinely full storage report failure', () => {
  mock(1);
  assert.throws(() => storage.saveDraft(receipt), { name: 'QuotaExceededError' });
  global.localStorage.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  assert.throws(() => storage.saveToHistory(receipt), { name: 'SecurityError' });
});
