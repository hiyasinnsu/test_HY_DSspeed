// End-to-end check in a real browser: boot, start, drag, bomb, pause, resume.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runBrowserCheck } from '../tools/browser-check.mjs';

test('browser smoke test', { timeout: 120000 }, async () => {
  const report = await runBrowserCheck();
  console.log(JSON.stringify(report, null, 2));
  assert.equal(report.boot, true, 'app booted');
  assert.equal(report.afterStart.mode, 'playing');
  assert.ok(report.afterStart.exists, 'world created');
  assert.ok(report.dragMovedBy > 5, 'drag moves the ship');
  assert.ok(report.mid.bullets > 0, 'bullets are on screen');
  assert.equal(report.afterBomb.bombActive, true, 'bomb activates');
  assert.equal(report.paused.mode, 'paused');
  assert.equal(report.paused.pauseVisible, true);
  assert.equal(report.resumed, 'playing');
  assert.equal(report.result.mode, 'result');
  assert.equal(report.result.visible, true, 'result screen appears');
  assert.ok(report.touchMovedBy > 5, 'touch drag moves the ship');
  assert.equal(report.focusOnTwoFingers, true, 'two fingers switch to focus mode');
  assert.equal(report.layout.overflowX, false, 'no horizontal overflow on a phone viewport');
  assert.ok(report.fps >= 40, `fps ${report.fps}`);
  assert.deepEqual(report.errors, []);
  assert.equal(report.ok, true);
});
