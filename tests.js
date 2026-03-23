/* ── tests.js — Navigation Logic Validation ─────────────
   Runs in Node.js (no DOM required).
   Execute:  node tests.js
   ─────────────────────────────────────────────────────── */

'use strict';

// ── MINIMAL STUBS ───────────────────────────────────────
// Replicate only the state + navigation functions under test.

const NAV_LEFT_SEQ = [
  ...Array.from({ length: 10 }, (_, i) => ({ kind: 'slot', index: i })),
  { kind: 'mod', weapon: 0, slot: 0 },
  { kind: 'mod', weapon: 0, slot: 1 },
  { kind: 'mod', weapon: 0, slot: 2 },
  { kind: 'mod', weapon: 0, slot: 3 },
  { kind: 'mod', weapon: 1, slot: 0 },
  { kind: 'mod', weapon: 1, slot: 1 },
  { kind: 'mod', weapon: 1, slot: 2 },
  { kind: 'mod', weapon: 1, slot: 3 },
];

function makeState(overrides = {}) {
  return {
    leftItems:      Array(10).fill(null),
    backpackItems:  Array(16).fill(null),
    crateData:      { green: Array(8).fill(null), blue: Array(8).fill(null), grey: Array(8).fill(null), red: Array(8).fill(null) },
    weaponModSlots: [[null, null, null, null], [null, null, null, null]],
    vaultSection:   'green',
    focusMode:      'main',
    activePanel:    'left',
    leftFocusIdx:   0,
    rightFocusIdx:  0,
    rightPanel:     'backpack',
    ...overrides,
  };
}

// ── Replicated nav functions (pure — take state as arg) ─

function currentLeftEntry(state) {
  return NAV_LEFT_SEQ[state.leftFocusIdx];
}

function moveLeftFocus(state, delta) {
  const max = NAV_LEFT_SEQ.length - 1;
  state.leftFocusIdx = Math.max(0, Math.min(max, state.leftFocusIdx + delta));
  state.focusMode = currentLeftEntry(state).kind === 'mod' ? 'mod' : 'main';
  return state;
}

function rightCells(state) {
  if (state.rightPanel === 'backpack') return state.backpackItems;
  return state.crateData[state.vaultSection];
}

function moveRightFocus(state, delta) {
  const cells = rightCells(state);
  const cols = 4;
  if (delta === 1)  state.rightFocusIdx = Math.min(cells.length - 1, state.rightFocusIdx + 1);
  if (delta === -1) state.rightFocusIdx = Math.max(0, state.rightFocusIdx - 1);
  if (delta === 4)  state.rightFocusIdx = Math.min(cells.length - 1, state.rightFocusIdx + cols);
  if (delta === -4) state.rightFocusIdx = Math.max(0, state.rightFocusIdx - cols);
  return state;
}

function crossTo(state, targetPanel) {
  if (targetPanel === 'right') {
    const leftRow = Math.min(state.leftFocusIdx, 9);
    const rightCol = state.rightFocusIdx % 4;
    const targetRow = Math.floor(leftRow / 2);
    state.rightFocusIdx = Math.min(rightCells(state).length - 1, targetRow * 4 + rightCol);
    state.activePanel = 'right';
  } else {
    const rightRow = Math.floor(state.rightFocusIdx / 4);
    state.leftFocusIdx = Math.min(NAV_LEFT_SEQ.length - 1, rightRow * 2);
    state.activePanel = 'left';
    state.focusMode = currentLeftEntry(state).kind === 'mod' ? 'mod' : 'main';
  }
  return state;
}

function moveLeftToBackpack(state, leftIdx) {
  const item = state.leftItems[leftIdx];
  if (!item) return false;
  const emptyBp = state.backpackItems.indexOf(null);
  if (emptyBp === -1) return false;
  state.backpackItems[emptyBp] = item;
  state.leftItems[leftIdx] = null;
  return true;
}

function moveBackpackToLeft(state, bpIdx, leftIdx) {
  const item = state.backpackItems[bpIdx];
  if (!item) return false;
  const target = state.leftItems[leftIdx];
  state.leftItems[leftIdx]   = item;
  state.backpackItems[bpIdx] = target;
  return true;
}

function moveModToBackpack(state, weaponIdx, modSlot) {
  const item = state.weaponModSlots[weaponIdx][modSlot];
  if (!item) return false;
  const emptyBp = state.backpackItems.indexOf(null);
  if (emptyBp === -1) return false;
  state.backpackItems[emptyBp] = item;
  state.weaponModSlots[weaponIdx][modSlot] = null;
  return true;
}

function moveBackpackToVault(state, bpIdx) {
  const item = state.backpackItems[bpIdx];
  if (!item) return false;
  const vault = state.crateData[state.vaultSection];
  const emptyVault = vault.indexOf(null);
  if (emptyVault === -1) return false;
  vault[emptyVault] = item;
  state.backpackItems[bpIdx] = null;
  return true;
}

function moveVaultToBackpack(state, vaultIdx) {
  const vault = state.crateData[state.vaultSection];
  const item = vault[vaultIdx];
  if (!item) return false;
  const emptyBp = state.backpackItems.indexOf(null);
  if (emptyBp === -1) return false;
  state.backpackItems[emptyBp] = item;
  vault[vaultIdx] = null;
  return true;
}

// ── TEST HARNESS ───────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg ?? 'Assertion failed');
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg ?? `Expected ${JSON.stringify(a)} === ${JSON.stringify(b)}`);
}

function assertDeepEqual(a, b, msg) {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa !== sb) throw new Error(msg ?? `Expected ${sa} === ${sb}`);
}

// ── NAV_LEFT_SEQ STRUCTURE ─────────────────────────────
console.log('\nNAV_LEFT_SEQ structure');

test('has 18 entries total (10 slots + 8 mod slots)', () => {
  assertEqual(NAV_LEFT_SEQ.length, 18);
});

test('first 10 entries are slots', () => {
  for (let i = 0; i < 10; i++) {
    assertEqual(NAV_LEFT_SEQ[i].kind, 'slot');
    assertEqual(NAV_LEFT_SEQ[i].index, i);
  }
});

test('entries 10-13 are weapon-0 mods 0-3', () => {
  for (let s = 0; s < 4; s++) {
    const e = NAV_LEFT_SEQ[10 + s];
    assertEqual(e.kind, 'mod');
    assertEqual(e.weapon, 0);
    assertEqual(e.slot, s);
  }
});

test('entries 14-17 are weapon-1 mods 0-3', () => {
  for (let s = 0; s < 4; s++) {
    const e = NAV_LEFT_SEQ[14 + s];
    assertEqual(e.kind, 'mod');
    assertEqual(e.weapon, 1);
    assertEqual(e.slot, s);
  }
});

// ── moveLeftFocus ──────────────────────────────────────
console.log('\nmoveLeftFocus');

test('moves forward by 1', () => {
  const s = makeState({ leftFocusIdx: 3 });
  moveLeftFocus(s, 1);
  assertEqual(s.leftFocusIdx, 4);
});

test('moves backward by 1', () => {
  const s = makeState({ leftFocusIdx: 5 });
  moveLeftFocus(s, -1);
  assertEqual(s.leftFocusIdx, 4);
});

test('clamps at 0 going up from 0', () => {
  const s = makeState({ leftFocusIdx: 0 });
  moveLeftFocus(s, -1);
  assertEqual(s.leftFocusIdx, 0);
});

test('clamps at max (17) going down from 17', () => {
  const s = makeState({ leftFocusIdx: 17 });
  moveLeftFocus(s, 1);
  assertEqual(s.leftFocusIdx, 17);
});

test('sets focusMode to "mod" when entering mod entries', () => {
  const s = makeState({ leftFocusIdx: 9 });
  moveLeftFocus(s, 1); // moves to index 10 = first mod
  assertEqual(s.focusMode, 'mod');
});

test('sets focusMode to "main" when in slot entries', () => {
  const s = makeState({ leftFocusIdx: 10 });
  moveLeftFocus(s, -1); // back to slot 9
  assertEqual(s.focusMode, 'main');
});

// ── moveRightFocus ─────────────────────────────────────
console.log('\nmoveRightFocus');

test('moves right by 1 within row', () => {
  const s = makeState({ rightFocusIdx: 0 });
  moveRightFocus(s, 1);
  assertEqual(s.rightFocusIdx, 1);
});

test('moves left by 1 within row', () => {
  const s = makeState({ rightFocusIdx: 3 });
  moveRightFocus(s, -1);
  assertEqual(s.rightFocusIdx, 2);
});

test('moves down a row (+4)', () => {
  const s = makeState({ rightFocusIdx: 1 });
  moveRightFocus(s, 4);
  assertEqual(s.rightFocusIdx, 5);
});

test('moves up a row (-4)', () => {
  const s = makeState({ rightFocusIdx: 5 });
  moveRightFocus(s, -4);
  assertEqual(s.rightFocusIdx, 1);
});

test('clamps at 0 going left from 0', () => {
  const s = makeState({ rightFocusIdx: 0 });
  moveRightFocus(s, -1);
  assertEqual(s.rightFocusIdx, 0);
});

test('clamps at last cell going right from last', () => {
  const s = makeState({ rightFocusIdx: 15 });
  moveRightFocus(s, 1);
  assertEqual(s.rightFocusIdx, 15);
});

test('clamps at 0 going up from top row', () => {
  const s = makeState({ rightFocusIdx: 2 });
  moveRightFocus(s, -4);
  assertEqual(s.rightFocusIdx, 0); // 2 - 4 < 0 → 0
});

// ── crossTo ───────────────────────────────────────────
console.log('\ncrossTo');

test('crossTo(right) switches activePanel to right', () => {
  const s = makeState({ activePanel: 'left', leftFocusIdx: 0 });
  crossTo(s, 'right');
  assertEqual(s.activePanel, 'right');
});

test('crossTo(left) switches activePanel to left', () => {
  const s = makeState({ activePanel: 'right', rightFocusIdx: 4 });
  crossTo(s, 'left');
  assertEqual(s.activePanel, 'left');
});

test('crossTo(right) from left slot 0 targets rightFocusIdx row 0', () => {
  const s = makeState({ leftFocusIdx: 0, rightFocusIdx: 0 });
  crossTo(s, 'right');
  // leftRow=0, targetRow=0, col=0 → 0
  assertEqual(s.rightFocusIdx, 0);
});

test('crossTo(right) from left slot 4 targets right row 2', () => {
  const s = makeState({ leftFocusIdx: 4, rightFocusIdx: 1 });
  crossTo(s, 'right');
  // leftRow=4, targetRow=floor(4/2)=2, col=1 → 9
  assertEqual(s.rightFocusIdx, 9);
});

test('crossTo(left) from right row 2 targets left idx 4', () => {
  const s = makeState({ activePanel: 'right', rightFocusIdx: 8 });
  crossTo(s, 'left');
  // rightRow = floor(8/4) = 2, leftFocusIdx = 2*2 = 4
  assertEqual(s.leftFocusIdx, 4);
});

test('crossTo(left) does not exceed NAV_LEFT_SEQ length', () => {
  const s = makeState({ activePanel: 'right', rightFocusIdx: 15 });
  crossTo(s, 'left');
  assert(s.leftFocusIdx < NAV_LEFT_SEQ.length, `leftFocusIdx ${s.leftFocusIdx} out of range`);
});

// ── moveLeftToBackpack ────────────────────────────────
console.log('\nmoveLeftToBackpack');

test('moves item from left to first empty backpack slot', () => {
  const item = { id: 'w0', name: 'KESTREL', type: 'rifle', rarity: 'rare', weight: 4 };
  const s = makeState();
  s.leftItems[0] = item;
  const ok = moveLeftToBackpack(s, 0);
  assert(ok, 'should return true');
  assert(s.leftItems[0] === null, 'left slot should be null');
  assert(s.backpackItems[0] === item, 'backpack[0] should have item');
});

test('returns false when left slot is empty', () => {
  const s = makeState();
  const ok = moveLeftToBackpack(s, 0);
  assert(!ok, 'should return false');
});

test('returns false when backpack is full', () => {
  const item = { id: 'w0', name: 'X', type: 'rifle', rarity: 'common', weight: 1 };
  const s = makeState();
  s.leftItems[0] = item;
  s.backpackItems = Array(16).fill({ id: 'x', name: 'X', type: 'ammo', rarity: 'common', weight: 0.1 });
  const ok = moveLeftToBackpack(s, 0);
  assert(!ok, 'should return false when backpack full');
});

// ── moveBackpackToLeft ────────────────────────────────
console.log('\nmoveBackpackToLeft');

test('moves item from backpack to empty left slot', () => {
  const item = { id: 'b0', name: 'FRAG', type: 'grenade', rarity: 'common', weight: 0.6 };
  const s = makeState();
  s.backpackItems[2] = item;
  const ok = moveBackpackToLeft(s, 2, 5);
  assert(ok, 'should return true');
  assert(s.leftItems[5] === item, 'left[5] should have item');
  assert(s.backpackItems[2] === null, 'backpack[2] should be null');
});

test('swaps when left slot is occupied', () => {
  const bpItem   = { id: 'b0', name: 'FRAG',   type: 'grenade', rarity: 'common', weight: 0.6 };
  const leftItem = { id: 'l0', name: 'KESTREL', type: 'rifle',   rarity: 'rare',   weight: 4 };
  const s = makeState();
  s.backpackItems[0] = bpItem;
  s.leftItems[0]     = leftItem;
  moveBackpackToLeft(s, 0, 0);
  assert(s.leftItems[0] === bpItem,   'left should now hold bpItem');
  assert(s.backpackItems[0] === leftItem, 'backpack should now hold leftItem');
});

test('returns false when backpack slot is empty', () => {
  const s = makeState();
  const ok = moveBackpackToLeft(s, 0, 0);
  assert(!ok, 'should return false');
});

// ── moveModToBackpack ─────────────────────────────────
console.log('\nmoveModToBackpack');

test('moves mod to backpack and clears mod slot', () => {
  const mod = { id: 'm0', name: 'HOLO', type: 'mod', rarity: 'uncommon', weight: 0.2 };
  const s = makeState();
  s.weaponModSlots[0][1] = mod;
  const ok = moveModToBackpack(s, 0, 1);
  assert(ok, 'should return true');
  assert(s.weaponModSlots[0][1] === null, 'mod slot should be cleared');
  assert(s.backpackItems[0] === mod, 'backpack[0] should have mod');
});

test('returns false when mod slot is empty', () => {
  const s = makeState();
  const ok = moveModToBackpack(s, 0, 0);
  assert(!ok, 'should return false');
});

// ── moveBackpackToVault ───────────────────────────────
console.log('\nmoveBackpackToVault');

test('moves item from backpack to vault', () => {
  const item = { id: 'b1', name: 'MEDKIT', type: 'medkit', rarity: 'uncommon', weight: 1 };
  const s = makeState();
  s.backpackItems[3] = item;
  const ok = moveBackpackToVault(s, 3);
  assert(ok, 'should return true');
  assert(s.backpackItems[3] === null, 'backpack slot should be null');
  assert(s.crateData.green[0] === item, 'vault green[0] should have item');
});

test('returns false when backpack slot is empty', () => {
  const s = makeState();
  const ok = moveBackpackToVault(s, 0);
  assert(!ok, 'should return false');
});

test('returns false when vault section is full', () => {
  const item = { id: 'b1', name: 'X', type: 'ammo', rarity: 'common', weight: 0.1 };
  const filler = { id: 'f', name: 'F', type: 'ammo', rarity: 'common', weight: 0.1 };
  const s = makeState();
  s.backpackItems[0] = item;
  s.crateData.green  = Array(8).fill(filler);
  const ok = moveBackpackToVault(s, 0);
  assert(!ok, 'should return false when vault full');
});

// ── moveVaultToBackpack ───────────────────────────────
console.log('\nmoveVaultToBackpack');

test('moves item from vault to backpack', () => {
  const item = { id: 'v0', name: 'LIGHT FRAME', type: 'equip', rarity: 'uncommon', weight: 1.2 };
  const s = makeState();
  s.crateData.green[2] = item;
  const ok = moveVaultToBackpack(s, 2);
  assert(ok, 'should return true');
  assert(s.crateData.green[2] === null, 'vault slot should be null');
  assert(s.backpackItems[0] === item, 'backpack[0] should have item');
});

test('returns false when vault slot is empty', () => {
  const s = makeState();
  const ok = moveVaultToBackpack(s, 0);
  assert(!ok, 'should return false');
});

test('returns false when backpack is full', () => {
  const item   = { id: 'v0', name: 'X', type: 'ammo', rarity: 'common', weight: 0.1 };
  const filler = { id: 'f',  name: 'F', type: 'ammo', rarity: 'common', weight: 0.1 };
  const s = makeState();
  s.crateData.green[0] = item;
  s.backpackItems      = Array(16).fill(filler);
  const ok = moveVaultToBackpack(s, 0);
  assert(!ok, 'should return false when backpack full');
});

// ── ROUND-TRIP TESTS ──────────────────────────────────
console.log('\nRound-trip scenarios');

test('item left→backpack→vault→backpack→left round-trip preserves identity', () => {
  const item = { id: 'rt0', name: 'RT ITEM', type: 'equip', rarity: 'rare', weight: 2 };
  const s = makeState();
  s.leftItems[3] = item;

  moveLeftToBackpack(s, 3);
  assert(s.backpackItems[0] === item, 'step 1: should be in backpack');

  moveBackpackToVault(s, 0);
  assert(s.crateData.green[0] === item, 'step 2: should be in vault');

  moveVaultToBackpack(s, 0);
  assert(s.backpackItems[0] === item, 'step 3: should be back in backpack');

  moveBackpackToLeft(s, 0, 3);
  assert(s.leftItems[3] === item, 'step 4: should be back in left slot');
});

test('full backpack prevents left→backpack move', () => {
  const item   = { id: 'x', name: 'X', type: 'rifle', rarity: 'rare', weight: 4 };
  const filler = { id: 'f', name: 'F', type: 'ammo',  rarity: 'common', weight: 0.1 };
  const s = makeState();
  s.leftItems[0]  = item;
  s.backpackItems = Array(16).fill(filler);
  const ok = moveLeftToBackpack(s, 0);
  assert(!ok, 'should fail');
  assert(s.leftItems[0] === item, 'item should still be in left slot');
});

test('crossTo left→right→left preserves focusMode=main for slot entries', () => {
  const s = makeState({ leftFocusIdx: 2, activePanel: 'left' });
  crossTo(s, 'right');
  assertEqual(s.activePanel, 'right');
  crossTo(s, 'left');
  assertEqual(s.activePanel, 'left');
  assertEqual(s.focusMode, 'main');
});

// ── SUMMARY ───────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('TESTS FAILED');
  process.exit(1);
} else {
  console.log('All tests passed.');
}
