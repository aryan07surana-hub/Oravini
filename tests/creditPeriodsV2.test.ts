import test from 'node:test';import assert from 'node:assert/strict';import {calendarMonthBoundary,FREE_V2_POLICY,freeV2PeriodKey} from '../shared/creditPeriodsV2';
test('calendar months preserve original month-end anchor and leap year',()=>{const a=new Date('2028-01-31T12:15:00Z');assert.equal(calendarMonthBoundary(a,1).toISOString(),'2028-02-29T12:15:00.000Z');assert.equal(calendarMonthBoundary(a,2).toISOString(),'2028-03-31T12:15:00.000Z');assert.equal(calendarMonthBoundary(a,12).toISOString(),'2029-01-31T12:15:00.000Z');});
test('free confirmed monthly100 no rollover',()=>{assert.equal(FREE_V2_POLICY.credits,100);assert.equal(FREE_V2_POLICY.cadence,'monthly');assert.equal(FREE_V2_POLICY.rollover,false);assert.equal(freeV2PeriodKey(new Date('2026-12-31T20:00Z')),'2026-12');});
// The Free monthly grant is implemented in server/billing/ledger.ts (refreshLocked) and
// covered against Postgres in tests/billingV2Ledger.integration.test.ts.
