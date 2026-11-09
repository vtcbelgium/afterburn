import test from 'node:test';
import assert from 'node:assert/strict';
import { RunState, makeRow, crossedPlayer } from '../src/rules.js';

test('boost adds speed, consumes energy, locks at empty until released', () => {
  const normal = new RunState();
  const boosted = new RunState();
  normal.update(1, false); boosted.update(1, true);
  assert.ok(boosted.distance > normal.distance);
  assert.equal(boosted.energy, 69);
  for (let i = 0; i < 5; i++) boosted.update(1, true);
  assert.equal(boosted.boosting, false);
  boosted.update(1, false);
  boosted.update(0.1, true);
  assert.equal(boosted.boosting, true);
});

test('damage has a grace period and three hits end the run', () => {
  const state = new RunState();
  assert.equal(state.hit(), true);
  assert.equal(state.hit(), false);
  assert.equal(state.hull, 2);
  state.update(2, false); state.hit();
  state.update(2, false); state.hit();
  assert.equal(state.over, true);
  assert.equal(state.hull, 0);
  const score = state.score;
  state.update(5, true); state.pickup(); state.nearMiss();
  assert.equal(state.score, score);
});

test('pickups replenish boost, multipliers cap, reset removes prior run state', () => {
  const state = new RunState();
  state.update(2, true);
  state.pickup();
  assert.equal(state.energy, 50);
  assert.equal(state.collected, 1);
  for (let i = 0; i < 20; i++) state.nearMiss();
  assert.equal(state.combo, 8);
  state.hit();
  assert.equal(state.combo, 1);
  state.reset();
  assert.equal(state.score, 0);
  assert.equal(state.collected, 0);
  assert.equal(state.hull, 3);
  assert.equal(state.energy, 100);
});

test('generated rows always leave a lane open, including maximum difficulty', () => {
  let seed = 24681;
  const seeded = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 10000; i++) {
    const row = makeRow(seeded, i / 10);
    assert.ok(row.blocked.length > 0 && row.blocked.length < 3);
    assert.ok(!row.blocked.includes(row.safeLane));
    assert.equal(new Set(row.blocked).size, row.blocked.length);
  }
});

test('swept collisions catch obstacles crossing the entire player between frames', () => {
  assert.equal(crossedPlayer(1, 12), true);
  assert.equal(crossedPlayer(-20, -5), false);
  assert.equal(crossedPlayer(10, 12), false);
  assert.equal(crossedPlayer(5, 5.5), true);
});
