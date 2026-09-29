// Node's built-in test runner (no extra dependency):  npm run test:time
// Runs lib/time.ts (type stripping, Node >= 22.18) and proves its output does NOT depend on the
// process time zone by re-running the same probe under several TZ values.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const TIME_TS = pathToFileURL(path.resolve('src/lib/time.ts')).href;
const {
  formatSalonTime, formatSalonDateTimeLong, formatSalonDate, formatDateOnly,
  salonToday, addDaysISO, weekdayMonday0, toSalonInputValue,
} = await import(TIME_TS);

test('instants are shown in Berlin summer and winter time', () => {
  assert.equal(formatSalonTime('2026-10-13T07:00:00+00:00'), '09:00'); // CEST
  assert.equal(formatSalonTime('2026-10-13T09:00:00+02:00'), '09:00'); // API format (Berlin offset)
  assert.equal(formatSalonTime('2026-10-27T08:00:00Z'), '09:00');      // CET
  assert.equal(formatSalonTime('2027-03-29T07:00:00Z'), '09:00');      // first summer-time Monday
  assert.equal(formatSalonTime('2026-10-25T00:30:00Z'), '02:30');      // 02:30 CEST (first occurrence)
  assert.equal(formatSalonTime('2026-10-25T01:30:00Z'), '02:30');      // 02:30 CET (second occurrence)
});

test('long format contains salon date and time', () => {
  const s = formatSalonDateTimeLong('2026-10-13T07:00:00Z');
  assert.match(s, /Dienstag/);
  assert.match(s, /13\. Oktober 2026/);
  assert.match(s, /09:00/);
});

test('"today" is the Berlin calendar date, not the UTC date', () => {
  assert.equal(salonToday(new Date('2026-10-12T22:30:00Z')), '2026-10-13');  // 00:30 CEST
  assert.equal(salonToday(new Date('2026-10-13T21:59:59Z')), '2026-10-13');
  assert.equal(salonToday(new Date('2026-10-13T22:00:00Z')), '2026-10-14');
  assert.equal(salonToday(new Date('2026-10-26T22:59:59Z')), '2026-10-26');  // CET
  assert.equal(salonToday(new Date('2026-10-26T23:00:00Z')), '2026-10-27');
});

test('calendar-date arithmetic is independent of DST', () => {
  assert.equal(addDaysISO('2026-10-24', 1), '2026-10-25');
  assert.equal(addDaysISO('2026-10-24', 2), '2026-10-26');
  assert.equal(addDaysISO('2027-03-27', 2), '2027-03-29');
  assert.equal(addDaysISO('2026-12-31', 1), '2027-01-01');
  assert.equal(weekdayMonday0('2026-10-13'), 1); // Tuesday
  assert.equal(weekdayMonday0('2026-10-25'), 6); // Sunday
  assert.equal(weekdayMonday0('2026-10-26'), 0); // Monday
});

test('datetime-local values are salon wall time (and never "24:00")', () => {
  assert.equal(toSalonInputValue('2026-10-13T07:00:00Z'), '2026-10-13T09:00');
  assert.equal(toSalonInputValue('2026-10-12T22:00:00Z'), '2026-10-13T00:00');
  assert.equal(toSalonInputValue('2026-10-25T01:30:00Z'), '2026-10-25T02:30');
});

test('plain dates never shift', () => {
  assert.equal(formatDateOnly('2026-10-13', { day: 'numeric', month: 'numeric', year: 'numeric' }), '13.10.2026');
  assert.equal(formatSalonDate('2026-10-12T22:30:00Z'), '13.10.2026');
});

test('output is identical under every process time zone', () => {
  const probe = `
    const t = await import(${JSON.stringify(TIME_TS)});
    const out = {
      offset: new Date('2026-10-13T12:00:00Z').getTimezoneOffset(),
      time: t.formatSalonTime('2026-10-13T07:00:00Z'),
      long: t.formatSalonDateTimeLong('2026-10-13T07:00:00Z'),
      today: t.salonToday(new Date('2026-10-12T22:30:00Z')),
      add: t.addDaysISO('2026-10-24', 2),
      wd: t.weekdayMonday0('2026-10-25'),
      input: t.toSalonInputValue('2026-10-25T01:30:00Z'),
      only: t.formatDateOnly('2026-10-13', { day: 'numeric', month: 'numeric', year: 'numeric' }),
    };
    console.log(JSON.stringify(out));`;
  const zones = ['Europe/Berlin', 'UTC', 'America/Los_Angeles', 'Pacific/Kiritimati', 'Asia/Kolkata'];
  const results = zones.map((TZ) => {
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', probe], { env: { ...process.env, TZ }, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return { TZ, ...JSON.parse(r.stdout.trim().split('\n').pop()) };
  });
  // The harness really switched zones (otherwise this test would prove nothing):
  assert.equal(new Set(results.map((r) => r.offset)).size, zones.length, `TZ override not effective: ${JSON.stringify(results.map((r) => [r.TZ, r.offset]))}`);
  const KEYS = ['time', 'long', 'today', 'add', 'wd', 'input', 'only'];
  const pick = (r) => Object.fromEntries(KEYS.map((k) => [k, r[k]]));
  for (const r of results) {
    assert.deepEqual(pick(r), pick(results[0]), `output differs under TZ=${r.TZ}`);
  }
});
