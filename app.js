/* ── app.js — Marathon Inventory UI ──────────────────────
   Split from single-file prototype.
   SVG icons replace emoji. localStorage persistence added.
   ─────────────────────────────────────────────────────── */
'use strict';

// ── CONSTANTS ──────────────────────────────────────────

const CR = '&#11041;'; // ⬡ hexagon currency symbol

const STORAGE = {
  LEFT:    'marathon_left_v3',
  BACKPACK:'marathon_backpack_v2',
  CRATE:   'marathon_crate_v2',
  MODS:    'marathon_mods',
};

const LS = { WEAPON1:0, WEAPON2:1, EQUIP1:2, SHIELD:3, CORES:4, CORE2:5, IMPL1:6, IMPL2:7, IMPL3:8 };
const FILTERS      = ['ALL','WEAPONS','TACTICAL','AMMO','CONSUMABLES'];
const FILTER_SECS  = { ALL:['green','blue','grey','red'], WEAPONS:['green'], TACTICAL:['blue'], AMMO:['grey'], CONSUMABLES:['red'] };
const CRATE_ORDER  = ['green','blue','grey','red'];
const RARITY_COLORS = { common:'#4a5268', uncommon:'#2ecc71', rare:'#3b9eff', epic:'#a855f7', legendary:'#f59e0b' };
const MOD_SLOT_NAMES = ['BAR','SCO','GRI','STO'];
const MOD_SLOT_FULL  = ['BARREL','SCOPE','GRIP','STOCK'];

let activeFilter = 0;

// Left-panel nav sequence — column-aware rows
const NAV_LEFT_SEQ = [
  { type: 'mods-row', weaponIdx: 0, row: 0 },                          // W1 top    (BAR / SCO)
  { type: 'mods-row', weaponIdx: 0, row: 1 },                          // W1 bottom (GRI / STO)
  { type: 'mods-row', weaponIdx: 1, row: 0 },                          // W2 top    (BAR / SCO)
  { type: 'mods-row', weaponIdx: 1, row: 1 },                          // W2 bottom (GRI / STO)
  { type: 'gear-row', slots: [LS.EQUIP1, LS.SHIELD] },                 // Equipment / Shield
  { type: 'gear-row', slots: [LS.CORES,  LS.CORE2]  },                 // Core 1   / Core 2
  { type: 'implants', slots: [LS.IMPL1, LS.IMPL2, LS.IMPL3] },        // Implants
];

// ── SVG ICON SYSTEM ────────────────────────────────────

const ICON_PATHS = {
  weapon: `<path d="M3 13h3l1-3 2.5 7.5 2.5-7 2 3.5H20l1.5-1.5" stroke-linecap="round" stroke-linejoin="round"/>
           <rect x="2" y="10" width="3" height="5" rx="1"/>`,

  tactical: `<circle cx="12" cy="12" r="2.5"/>
             <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21
                      M5.64 5.64l1.77 1.77M16.59 16.59l1.77 1.77
                      M5.64 18.36l1.77-1.77M16.59 7.41l1.77-1.77"/>`,

  ammo: `<rect x="9" y="3" width="6" height="9" rx="2"/>
         <line x1="12" y1="12" x2="12" y2="19"/>
         <line x1="9"  y1="19" x2="15" y2="19"/>`,

  consumable: `<rect x="3" y="8" width="18" height="13" rx="2"/>
               <path d="M9 14h6M12 11v6"/>
               <path d="M8 8V6a2 2 0 0 1 4 0v2M12 8V6a2 2 0 0 1 4 0v2"/>`,

  medkit: `<rect x="3" y="8" width="18" height="13" rx="2"/>
           <path d="M9 14h6M12 11v6"/>`,

  shield: `<path d="M12 3L4 7.5v4.6C4 17 7.6 21.1 12 22c4.4-.9 8-5 8-9.9V7.5L12 3z"/>`,

  core: `<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>`,

  implant: `<rect x="6" y="6" width="12" height="12" rx="2"/>
            <line x1="12" y1="6"  x2="12" y2="3"/>
            <line x1="12" y1="18" x2="12" y2="21"/>
            <line x1="6"  y1="12" x2="3"  y2="12"/>
            <line x1="18" y1="12" x2="21" y2="12"/>`,

  equip: `<path d="M3 12h18M3 6h18M3 18h18" stroke-linecap="round"/>`,

  mod: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,

  grenade: `<circle cx="12" cy="14" r="6"/>
            <path d="M12 8V4M10 4h4"/>`,

  default: `<rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="3 2"/>`,
};

// Raster image overrides — save PNGs to assets/icons/ with these names
const RASTER_ICONS = {
  weapon:     'assets/icons/item-weapon.png',
  ammo:       'assets/icons/item-ammo.png',
  core:       'assets/icons/item-core.png',
  equip:      'assets/icons/item-equip.png',
  shield:     'assets/icons/item-shield.png',
  grenade:    'assets/icons/item-grenade.png',
  consumable: 'assets/icons/item-grenade.png',
  medkit:     'assets/icons/item-grenade.png',
  implant:    'assets/icons/item-implant.png',
  tactical:   'assets/icons/item-equip.png',
};

/**
 * Returns an img or inline SVG for the given item type.
 * Raster assets are used for weapon/ammo; SVG for everything else.
 */
function renderIcon(type, size = 24) {
  if (RASTER_ICONS[type]) {
    return `<img src="${RASTER_ICONS[type]}" alt="${type}" onerror="this.style.display='none'" />`;
  }
  return svgFallback(type, size);
}

function svgFallback(type, size = 24) {
  const path = ICON_PATHS[type] ?? ICON_PATHS.default;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="1.5"
    stroke-linecap="round" stroke-linejoin="round"
    xmlns="http://www.w3.org/2000/svg">${path}</svg>`;
}

// ── ITEM CARD HELPERS ───────────────────────────────────

const GEM_SVG = `<svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <polygon points="8,1 14,6 8,15 2,6"/>
  <polygon points="2,6 14,6 8,1" fill="rgba(0,0,0,.3)"/>
  <polygon points="5,6 11,6 8,1" fill="rgba(255,255,255,.2)"/>
</svg>`;

function imxValue(item) {
  const h = [...(item.id || 'x')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0);
  return (Math.abs(h) % 1000) + 1;
}

function makeItemCardHTML(item) {
  const imgHTML = RASTER_ICONS[item.type]
    ? `<img src="${RASTER_ICONS[item.type]}" alt="${item.type}" onerror="this.style.display='none'" />`
    : svgFallback(item.type, 32);
  return `
    <div class="ic-header">
      <span class="ic-gem">${GEM_SVG}</span>
      <span class="ic-val">${imxValue(item)}</span>
    </div>
    <div class="ic-type">${svgFallback(item.type, 13)}</div>
    <div class="ic-img">${imgHTML}</div>
    <div class="slot-label">${item.label}</div>
    ${item.qty ? `<div class="slot-qty">×${item.qty}</div>` : ''}
  `;
}

// ── PS BUTTON ICONS ────────────────────────────────────

const PS_ICON_NAMES = {
  triangle: 'outline-green-triangle',
  cross:    'outline-blue-cross',
  square:   'outline-purple-square',
  circle:   'outline-red-circle',
};

const KB_MAP = {
  triangle: 'V',
  cross:    'LMB',
  square:   'F',
  circle:   'RMB',
};
function psKey(type, wrapClass = 'act-key', isLong = false) {
  if (inputMode === 'mouse' && KB_MAP[type]) {
    const label = KB_MAP[type];
    const prefix = isLong ? '<span class="kb-hold">hold</span>' : '';
    return `<span class="${wrapClass} kb-key-wrap">${prefix}<span class="kb-key">${label}</span></span>`;
  }
  const base = PS_ICON_NAMES[type] ?? `outline-${type}`;
  const src  = `assets/icons/${base}${isLong ? '-LongPress' : ''}.svg`;
  return `<span class="${wrapClass}"><img src="${src}" class="ps-btn-img" alt="${type}${isLong ? ' long-press' : ''}" /></span>`;
}

// ── DEFAULT DATA ────────────────────────────────────────

function makeDefaultLeft() {
  const arr = new Array(9).fill(null);
  arr[LS.WEAPON1] = { id:'overrun_ar',  label:'OVERRUN AR',   val:614,  fullName:'OVERRUN ASSAULT RIFLE',    desc:'Modular AR with high adaptability for mid-range engagements.', stats:[{n:'Damage',v:58,pct:58},{n:'Fire Rate',v:62,pct:62},{n:'Range',v:70,pct:70}], type:'weapon',     rarity:'rare' };
  arr[LS.EQUIP1]  = { id:'frag_a',      label:'FRAG',         val:120,  fullName:'FRAG GRENADE',             desc:'Fragmentation explosive. Deals high area damage.',              stats:[{n:'Blast',v:75,pct:75},{n:'Fuse',v:30,pct:30},{n:'Radius',v:60,pct:60}],   type:'grenade',    rarity:'uncommon' };
  arr[LS.SHIELD]  = { id:'shield_std',  label:'SHIELD',       val:120,  fullName:'STANDARD SHIELD',          desc:'Absorbs incoming damage.',                                      stats:[{n:'Capacity',v:100,pct:100},{n:'Regen',v:20,pct:20}],                       type:'shield',     rarity:'uncommon' };
  arr[LS.CORES]   = { id:'core1',       label:'CORE',         val:80,   fullName:'COMBAT CORE',              desc:'Enhances core stats.',                                          stats:[{n:'Boost',v:60,pct:60}],                                                    type:'core',       rarity:'rare' };
  return arr;
}

function makeDefaultBackpack() {
  const arr = new Array(16).fill(null);
  arr[0] = { id:'ammo_ar',   label:'AR AMMO',    qty:100, val:15,  fullName:'AR AMMUNITION',     desc:'Standard AR rounds.',               stats:[{n:'Damage',v:44,pct:44},{n:'Velocity',v:78,pct:78}],   type:'ammo',      rarity:'uncommon' };
  arr[1] = { id:'ammo_hv',   label:'HV AMMO',    qty:100, val:12,  fullName:'HIGH-VEL ROUNDS',   desc:'Penetrates light armor.',           stats:[{n:'Damage',v:70,pct:70},{n:'Velocity',v:95,pct:95}],   type:'ammo',      rarity:'uncommon' };
  arr[2] = { id:'grenade',   label:'GRENADE',    qty:40,  val:40,  fullName:'FRAG GRENADE',      desc:'Fragmentation explosive.',          stats:[{n:'Blast',v:53,pct:53},{n:'Fuse',v:30,pct:30}],        type:'grenade',   rarity:'rare' };
  arr[3] = { id:'stim',      label:'STIM',       qty:3,   val:25,  fullName:'COMBAT STIM',       desc:'Boosts speed and reaction.',        stats:[{n:'Duration',v:40,pct:40},{n:'Boost',v:60,pct:60}],    type:'consumable',rarity:'common' };
  arr[4] = { id:'medkit',    label:'MEDKIT',     qty:3,   val:30,  fullName:'MEDKIT MK.1',       desc:'Restores 80 HP over 4s.',           stats:[{n:'Heal',v:80,pct:80},{n:'Cast',v:40,pct:40}],         type:'medkit',    rarity:'common' };
  arr[5] = { id:'shield_c',  label:'SH.CELL',    qty:2,   val:35,  fullName:'SHIELD CELL',       desc:'Recharges one shield bar.',         stats:[{n:'Restore',v:100,pct:100}],                           type:'shield',    rarity:'uncommon' };
  arr[6] = { id:'tac_a_bp',  label:'SUPPRESSOR', val:340, fullName:'MUZZLE SUPPRESSOR',          desc:'Reduces sound signature 90%.',      stats:[{n:'Noise',v:10,pct:10},{n:'Velocity',v:5,pct:5}],      type:'tactical',  rarity:'uncommon' };
  arr[7] = { id:'tac_b_bp',  label:'SCOPE X4',   val:598, fullName:'4X OPTIC SCOPE',             desc:'Magnified sight, mid-range.',       stats:[{n:'Zoom',v:40,pct:40},{n:'ADS Speed',v:60,pct:60}],    type:'tactical',  rarity:'uncommon' };
  return arr;
}

function makeDefaultCrate() {
  return {
    green: [
      { id:'gun_a', label:'HAIL SMG',    val:614,  fullName:'HAIL SMG',               desc:'High rate-of-fire SMG.',            stats:[{n:'Fire Rate',v:90,pct:90},{n:'Range',v:30,pct:30}],         rarity:'uncommon', type:'weapon' },
      { id:'gun_b', label:'NEON AR',     val:710,  fullName:'NEON ASSAULT RIFLE',      desc:'Precision mid-range AR.',           stats:[{n:'Accuracy',v:72,pct:72},{n:'Range',v:65,pct:65}],          rarity:'rare',     type:'weapon' },
      { id:'gun_c', label:'FROST AR',    val:1400, fullName:'FROST ASSAULT RIFLE',     desc:'Cryo-tipped rounds slow targets.',  stats:[{n:'Accuracy',v:68,pct:68},{n:'Slow',v:40,pct:40}],          rarity:'uncommon', type:'weapon' },
      { id:'gun_d', label:'CAMO SG',     val:632,  fullName:'CAMO SHOTGUN',            desc:'Wide spread close-quarters.',       stats:[{n:'Spread',v:85,pct:85},{n:'Pellets',v:80,pct:80}],          rarity:'uncommon', type:'weapon' },
      { id:'gun_e', label:'GHOST SMG',   val:678,  fullName:'GHOST SMG',               desc:'Silenced, low recoil SMG.',         stats:[{n:'Recoil',v:15,pct:15},{n:'Fire Rate',v:75,pct:75}],        rarity:'uncommon', type:'weapon' },
      { id:'gun_f', label:'TACT SMG',    val:2800, fullName:'TACTICAL SMG',            desc:'Full-auto extended mag.',           stats:[{n:'Mag Size',v:90,pct:90},{n:'Handling',v:70,pct:70}],       rarity:'epic',     type:'weapon' },
      { id:'gun_g', label:'PRISM AR',    val:1400, fullName:'PRISM ASSAULT RIFLE',     desc:'Tri-burst energy rounds.',          stats:[{n:'Burst Dmg',v:95,pct:95},{n:'Range',v:80,pct:80}],         rarity:'rare',     type:'weapon' },
    ],
    blue: [
      { id:'tac_a', label:'SUPPRESSOR',  val:340,  fullName:'MUZZLE SUPPRESSOR',       desc:'Reduces sound signature 90%.',      stats:[{n:'Noise',v:10,pct:10},{n:'Velocity',v:5,pct:5}],            rarity:'uncommon', type:'tactical', hasX:true },
      { id:'tac_b', label:'SCOPE X4',    val:598,  fullName:'4X OPTIC SCOPE',          desc:'Magnified sight mid-range.',        stats:[{n:'Zoom',v:40,pct:40},{n:'ADS Speed',v:60,pct:60}],          rarity:'uncommon', type:'tactical', hasX:true },
      { id:'tac_c', label:'FLASHLIGHT',  val:321,  fullName:'TACTICAL LIGHT',          desc:'Illuminates dark areas.',           stats:[{n:'Range',v:40,pct:40},{n:'Width',v:60,pct:60}],              rarity:'uncommon', type:'tactical', hasX:true },
      { id:'tac_d', label:'GRIP TAPE',   val:2000, fullName:'ENHANCED GRIP TAPE',      desc:'Reduces recoil significantly.',     stats:[{n:'Recoil',v:45,pct:45},{n:'Stability',v:80,pct:80}],        rarity:'epic',     type:'tactical', qty:2 },
    ],
    grey: [
      { id:'ag1',   label:'AR AMMO',     val:30,   fullName:'AR AMMUNITION x17',       desc:'Bulk AR rounds.',                   stats:[{n:'Damage',v:44,pct:44},{n:'Velocity',v:78,pct:78}],         rarity:'uncommon', type:'ammo', hasX:true, qty:17 },
      { id:'ag2',   label:'MEDKIT',      val:35,   fullName:'MEDKIT MK.1',             desc:'Compact emergency kit.',            stats:[{n:'Heal',v:60,pct:60}],                                      rarity:'common',   type:'medkit' },
      null, null,
    ],
    red: [
      { id:'med_a', label:'MED PACK',    val:550,  fullName:'ADVANCED MED PACK',       desc:'Restores full HP over 6s.',         stats:[{n:'Heal',v:100,pct:100},{n:'Cast',v:60,pct:60}],                               rarity:'uncommon', type:'medkit' },
      { id:'med_b', label:'STIM SHOT',   val:550,  fullName:'ENHANCED STIM',           desc:'Amplified combat stim.',            stats:[{n:'Duration',v:66,pct:66},{n:'Boost',v:90,pct:90}],                            rarity:'uncommon', type:'consumable' },
      { id:'gren_a', label:'FRAG',       val:120,  fullName:'FRAG GRENADE',            desc:'Fragmentation explosive. High area damage.',      stats:[{n:'Blast',v:75,pct:75},{n:'Fuse',v:30,pct:30},{n:'Radius',v:60,pct:60}],     rarity:'uncommon', type:'grenade' },
      { id:'gren_b', label:'INCEN',      val:280,  fullName:'INCENDIARY GRENADE',      desc:'Ignites an area on impact.',        stats:[{n:'Burn',v:80,pct:80},{n:'Duration',v:50,pct:50},{n:'Radius',v:45,pct:45}],   rarity:'rare',     type:'grenade' },
      { id:'gren_c', label:'CRYO',       val:480,  fullName:'CRYO GRENADE',            desc:'Flash-freezes targets in range.',   stats:[{n:'Slow',v:95,pct:95},{n:'Duration',v:40,pct:40},{n:'Radius',v:55,pct:55}],   rarity:'rare',     type:'grenade' },
      { id:'gren_d', label:'VORTEX',     val:1800, fullName:'VORTEX GRENADE',          desc:'Pulls enemies into a singularity.', stats:[{n:'Pull',v:100,pct:100},{n:'Duration',v:35,pct:35},{n:'Radius',v:70,pct:70}], rarity:'epic',     type:'grenade' },
      { id:'sh_rare_a', label:'SHIELD',  val:420,  fullName:'REINFORCED SHIELD',       desc:'Heavy-duty shield with rapid regen.',              stats:[{n:'Capacity',v:160,pct:80},{n:'Regen',v:55,pct:55},{n:'Delay',v:30,pct:30}], rarity:'rare',     type:'shield' },
      { id:'sh_rare_b', label:'SHIELD',  val:380,  fullName:'ADAPTIVE SHIELD',         desc:'Adjusts resistance to incoming damage type.',      stats:[{n:'Capacity',v:140,pct:70},{n:'Regen',v:60,pct:60},{n:'Adapt',v:75,pct:75}], rarity:'rare',     type:'shield' },
      { id:'sh_epic_a', label:'SHIELD',  val:1600, fullName:'OVERCHARGE SHIELD',       desc:'Overcharges beyond base capacity on kills.',       stats:[{n:'Capacity',v:200,pct:100},{n:'Regen',v:80,pct:80},{n:'Surge',v:90,pct:90}],rarity:'epic',     type:'shield' },
    ],
  };
}

function makeDefaultMods() {
  return [
    [
      { id:'mod_supp', label:'SUPPRESSOR', val:340, fullName:'MUZZLE SUPPRESSOR', desc:'Reduces sound 90%.', stats:[{n:'Noise',v:10,pct:10},{n:'Velocity',v:5,pct:5}],       type:'tactical', rarity:'uncommon' },
      { id:'mod_sc4',  label:'SCOPE X4',   val:598, fullName:'4X OPTIC SCOPE',   desc:'Magnified sight.',   stats:[{n:'Zoom',v:40,pct:40},{n:'ADS Speed',v:60,pct:60}],     type:'tactical', rarity:'uncommon' },
      null, null,
    ],
    [null, null, null, null],
  ];
}

// ── PERSISTENCE ─────────────────────────────────────────

function saveState() {
  try {
    localStorage.setItem(STORAGE.LEFT,    JSON.stringify(leftItems));
    localStorage.setItem(STORAGE.BACKPACK,JSON.stringify(backpackItems));
    localStorage.setItem(STORAGE.CRATE,   JSON.stringify(crateData));
    localStorage.setItem(STORAGE.MODS,    JSON.stringify(weaponModSlots));
  } catch(e) { console.warn('Save failed:', e); }
}

function loadState() {
  try {
    const l = localStorage.getItem(STORAGE.LEFT);
    const b = localStorage.getItem(STORAGE.BACKPACK);
    const c = localStorage.getItem(STORAGE.CRATE);
    const m = localStorage.getItem(STORAGE.MODS);
    if (l) leftItems       = JSON.parse(l);
    if (b) backpackItems   = JSON.parse(b);
    if (c) crateData       = JSON.parse(c);
    if (m) weaponModSlots  = JSON.parse(m);
  } catch(e) {
    console.warn('Load failed, using defaults:', e);
  }
}

// ── STATE ───────────────────────────────────────────────

let leftItems      = makeDefaultLeft();
let backpackItems  = makeDefaultBackpack();
let crateData      = makeDefaultCrate();
let weaponModSlots = makeDefaultMods();

// ── ITEM ACCESS ─────────────────────────────────────────

function getItem(panel, idx) {
  if (panel === 'left')    return leftItems[idx];
  if (panel === 'backpack')return backpackItems[idx];
  if (panel === 'crate')   return getCrateFlat(idx);
  return null;
}
function setRaw(panel, idx, item) {
  if (panel === 'left')     leftItems[idx]    = item;
  else if (panel === 'backpack') backpackItems[idx] = item;
  else if (panel === 'crate')    setCrateFlat(idx, item);
}
function moveItem(fP, fI, tP, tI) {
  const item = getItem(fP, fI); if (!item) return;
  const displaced = getItem(tP, tI);
  setRaw(tP, tI, item); setRaw(fP, fI, displaced);
  saveState();
}

let crateMap = [];
function buildCrateMap() {
  crateMap = [];
  const vis = FILTER_SECS[FILTERS[activeFilter]];
  CRATE_ORDER.forEach(sec => {
    if (!vis.includes(sec)) return;
    (crateData[sec] || []).forEach((item, si) => { if (item !== null) crateMap.push({ sec, si }); });
  });
}
function getCrateFlat(gi) { const m = crateMap[gi]; if (!m) return null; return crateData[m.sec][m.si]; }
function setCrateFlat(gi, item) { const m = crateMap[gi]; if (!m) return; crateData[m.sec][m.si] = item; }

// ── FOCUS STATE ─────────────────────────────────────────

let focusMode    = 'main';
let focusPanel   = 'backpack', focusIdx = 0;
let modFocusWeapon = 0, modFocusSlot = 0;
let leftNavCol = 0; // column position within left-panel nav rows

// ── INPUT MODE ───────────────────────────────────────────
let inputMode = 'mouse'; // 'mouse' | 'controller'
function setInputMode(mode) {
  if (inputMode === mode) return;
  inputMode = mode;
  document.body.classList.toggle('controller-mode', mode === 'controller');
  // Refresh open panels so key labels update
  if (focusMode === 'mod') updateModFocusPanel();
  if (ctxOpen && _ctxPanel !== null) {
    const item = getItem(_ctxPanel, _ctxIdx);
    if (item) { _ctxActions = buildCtxActions(_ctxPanel, _ctxIdx, item); renderCtxActions(); }
  }
}
document.addEventListener('mousemove', () => setInputMode('mouse'));

let panels    = { left:[], backpack:[], crate:[] };
let modSlotEls = [[], []];
let activeWeapon = 0;
let ctxOpen = false, ctxActionIdx = 0, _ctxActions = [], _ctxPanel = null, _ctxIdx = null;
const kbHold = { f: null, v: null, x: null };
let swapPickerOpen = false, swapPickerFrom = null;
let modPickerOpen = false, modPickerWeaponIdx = 0, modPickerSlotIdx = 0, modPickerItems = [], modPickerFocusIdx = 0;
let ctxTimer = null;

// ── RENDER: LEFT PANEL ──────────────────────────────────

function renderLeft() {
  const c = document.getElementById('left-panel');
  c.innerHTML = ''; panels.left = []; modSlotEls = [[], []];

  [LS.WEAPON1, LS.WEAPON2].forEach((wLs, wIdx) => {
    const w       = leftItems[wLs];
    const isActive = activeWeapon === wIdx;
    const wrap    = document.createElement('div');
    wrap.className = 'wp-wrap' + (isActive && w ? ' is-active' : '');

    // Header row
    const hdr = document.createElement('div'); hdr.className = 'wp-header';
    const activeBadge = (isActive && w) ? `<span class="wp-active-badge">ACTIVE WEAPON</span>` : '';
    hdr.innerHTML = `<span class="wp-header-num">[${wIdx + 1}]</span><span class="wp-header-name">${w ? (w.fullName || w.label) : `WEAPON SLOT ${wIdx + 1}`}</span>${activeBadge}`;
    wrap.appendChild(hdr);

    // Body: mods (left) + weapon card (right) — always rendered, inert when no weapon
    const body = document.createElement('div'); body.className = 'wp-body';

    // 2×2 mod grid — always visible; interactive only when weapon is equipped
    const modsGrid = document.createElement('div'); modsGrid.className = 'wp-mods-grid';
    modSlotEls[wIdx] = [];
    MOD_SLOT_NAMES.forEach((sn, mIdx) => {
      const mod  = w ? weaponModSlots[wIdx][mIdx] : null;
      const slot = document.createElement('div');
      slot.className = 'item-slot mod-card' + (mod ? ' ' + (mod.rarity || 'common') : ' empty') + (w ? '' : ' wp-inert');
      slot.title = w ? MOD_SLOT_FULL[mIdx] : '';
      if (mod) { slot.innerHTML = makeItemCardHTML(mod); }
      else      { slot.innerHTML = `<span class="mod-card-label">${sn}</span>`; }
      if (w) {
        slot.addEventListener('click',      () => { setModFocus(wIdx, mIdx); if (!mod) openModPicker(wIdx, mIdx, slot); });
        slot.addEventListener('mouseenter', () => { if (inputMode !== 'mouse') return; setModFocus(wIdx, mIdx); });
        modSlotEls[wIdx][mIdx] = slot;
      }
      modsGrid.appendChild(slot);
    });
    body.appendChild(modsGrid);

    // Weapon card — interactive only when filled
    const wpCard = document.createElement('div');
    wpCard.className = 'item-slot wp-card' + (w ? ' ' + (w.rarity || 'common') : ' empty wp-inert');
    if (w) {
      wpCard.innerHTML = makeItemCardHTML(w);
      wpCard.addEventListener('click',      () => { setMainFocus('left', wLs); handleCrossAction('left', wLs); });
      wpCard.addEventListener('mouseenter', () => { if (inputMode !== 'mouse') return; setMainFocus('left', wLs); });
      applyDrag(wpCard, 'left', wLs);
      applyDropTarget(wpCard, 'left', wLs);
      panels.left[wLs] = wpCard;
    } else {
      wpCard.innerHTML = `<span class="wp-empty-label">+ WEAPON</span>`;
      applyDropTarget(wpCard, 'left', wLs);
      panels.left[wLs] = null; // skip in keyboard nav
    }
    body.appendChild(wpCard);
    wrap.appendChild(body);


    c.appendChild(wrap);
  });

  // ── Gear grid: left (EQUIP + CORES) | center silhouette | right (SHIELD)
  const gearGrid = document.createElement('div'); gearGrid.className = 'loadout-gear';

  // Left column: EQUIPMENT + CORE 1
  const lgLeft = document.createElement('div'); lgLeft.className = 'lg-col';
  lgLeft.appendChild(Object.assign(document.createElement('div'), { className: 'section-label', textContent: 'EQUIPMENT' }));
  lgLeft.appendChild(makeLeftSlot(LS.EQUIP1, 'eq-slot'));
  lgLeft.appendChild(Object.assign(document.createElement('div'), { className: 'section-label', textContent: 'CORE 1' }));
  lgLeft.appendChild(makeLeftSlot(LS.CORES, 'eq-slot'));
  gearGrid.appendChild(lgLeft);

  // Center silhouette
  const lgCtr = document.createElement('div'); lgCtr.className = 'lg-center';
  lgCtr.innerHTML = `<svg class="lg-silhouette" viewBox="0 0 44 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="14" y="0"  width="16" height="15" rx="2"/>
    <rect x="4"  y="17" width="36" height="6"  rx="1"/>
    <rect x="10" y="24" width="24" height="6"  rx="1"/>
    <rect x="12" y="31" width="20" height="20" rx="1"/>
    <rect x="10" y="52" width="10" height="28" rx="1"/>
    <rect x="24" y="52" width="10" height="28" rx="1"/>
  </svg>`;
  gearGrid.appendChild(lgCtr);

  // Right column: SHIELD + CORE 2
  const lgRight = document.createElement('div'); lgRight.className = 'lg-col';
  lgRight.appendChild(Object.assign(document.createElement('div'), { className: 'section-label', textContent: 'SHIELD' }));
  lgRight.appendChild(makeLeftSlot(LS.SHIELD, 'eq-slot'));
  lgRight.appendChild(Object.assign(document.createElement('div'), { className: 'section-label', textContent: 'CORE 2' }));
  lgRight.appendChild(makeLeftSlot(LS.CORE2, 'eq-slot'));
  gearGrid.appendChild(lgRight);

  c.appendChild(gearGrid);

  // Implants row
  const implLbl = document.createElement('div'); implLbl.className = 'section-label'; implLbl.textContent = 'IMPLANTS'; c.appendChild(implLbl);
  const implRow = document.createElement('div'); implRow.className = 'implant-row'; c.appendChild(implRow);
  [LS.IMPL1, LS.IMPL2, LS.IMPL3].forEach(si => implRow.appendChild(makeLeftSlot(si, 'implant-slot')));

  document.getElementById('loadout-val-small').innerHTML = `${CR}` + leftItems.reduce((s, i) => s + (i ? i.val : 0), 0);
}

function makeLeftSlot(si, extraClass = '') {
  const item = leftItems[si];
  const el   = document.createElement('div');
  el.className = 'item-slot ' + extraClass + (item ? ' ' + (item.rarity || 'common') : '') + (item ? '' : ' empty');
  if (item) {
    el.innerHTML = makeItemCardHTML(item);
  }
  el.addEventListener('click',      () => { setMainFocus('left', si); handleCrossAction('left', si); });
  el.addEventListener('mouseenter', () => { if (inputMode !== 'mouse') return; setMainFocus('left', si); });
  if (item) applyDrag(el, 'left', si);
  applyDropTarget(el, 'left', si);
  panels.left[si] = el;
  return el;
}

// ── RENDER: BACKPACK ────────────────────────────────────

function renderBackpack() {
  const g = document.getElementById('backpack-grid');
  g.innerHTML = ''; panels.backpack = [];
  backpackItems.forEach((item, i) => {
    const cell = document.createElement('div');
    cell.className = 'item-slot bp-slot' + (item ? ' ' + (item.rarity || 'common') : '') + (item ? '' : ' empty');
    if (item) {
      cell.innerHTML = makeItemCardHTML(item);
    }
    cell.addEventListener('click',      () => { setMainFocus('backpack', i); handleCrossAction('backpack', i); });
    cell.addEventListener('mouseenter', () => { if (inputMode !== 'mouse') return; setMainFocus('backpack', i); });
    if (item) applyDrag(cell, 'backpack', i);
    applyDropTarget(cell, 'backpack', i);
    g.appendChild(cell);
    panels.backpack.push(cell);
  });
  document.getElementById('bp-count').textContent = backpackItems.filter(x => x).length + '/16';
}

// ── RENDER: VAULT ───────────────────────────────────────

function renderVault() {
  buildCrateMap();
  const g = document.getElementById('vault-grid');
  g.innerHTML = ''; panels.crate = [];
  let totalVal = 0, totalCount = 0;
  crateMap.forEach(({ sec, si }, gi) => {
    const item = crateData[sec][si];
    totalVal += item.val; totalCount++;
    const card = document.createElement('div');
    card.className = 'item-slot vault-item ' + (item.rarity || 'common');
    card.innerHTML = makeItemCardHTML(item) + (item.hasX ? '<button class="vc-x">×</button>' : '');
    const xb = card.querySelector('.vc-x');
    if (xb) xb.addEventListener('click', ev => { ev.stopPropagation(); crateData[sec][si] = null; saveState(); renderVault(); renderAllFocus(); });
    card.addEventListener('click',      () => { setMainFocus('crate', gi); handleCrossAction('crate', gi); });
    card.addEventListener('mouseenter', () => { if (inputMode !== 'mouse') return; setMainFocus('crate', gi); });
    applyDrag(card, 'crate', gi);
    g.appendChild(card);
    panels.crate.push(card);
  });
  document.getElementById('vault-count').textContent = totalCount + '/160';
  document.getElementById('vault-val').innerHTML = `${CR}` + (totalVal >= 1000 ? (totalVal / 1000).toFixed(1) + 'k' : totalVal);
}

function renderFilterBar() {
  document.querySelectorAll('#icon-sidebar .icon-btn[data-filter]').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.filter) === activeFilter);
  });
}

document.getElementById('icon-sidebar').addEventListener('click', e => {
  const btn = e.target.closest('.icon-btn[data-filter]');
  if (!btn) return;
  activeFilter = parseInt(btn.dataset.filter);
  renderFilterBar(); renderVault(); renderAllFocus();
});

function renderAll() { renderLeft(); renderBackpack(); renderVault(); renderAllFocus(); calcLoadout(); }

// ── FOCUS ───────────────────────────────────────────────

function setMainFocus(panel, idx) {
  focusMode = 'main'; focusPanel = panel; focusIdx = idx;
  // Sync leftNavCol when focusing a left-panel gear or implant slot
  if (panel === 'left') {
    for (const entry of NAV_LEFT_SEQ) {
      if (entry.slots) {
        const ci = entry.slots.indexOf(idx);
        if (ci !== -1) { leftNavCol = ci; break; }
      }
    }
  }
  renderAllFocus();

  // Show compare panel when focusing backpack/vault item that conflicts with an equipped slot
  const item = getItem(panel, idx);
  if (item && (panel === 'backpack' || panel === 'crate')) {
    const conflict = findConflictItem(item);
    if (conflict) showComparePanel(conflict, item, panels[panel][idx]);
    else hideComparePanel();
  } else {
    hideComparePanel();
  }

  // Deferred: auto ctx-menu tooltip (always shown; compare panel shown alongside for conflicts)
  clearTimeout(ctxTimer);
  if (modPickerOpen) return;
  ctxTimer = setTimeout(() => {
    const it = getItem(focusPanel, focusIdx);
    if (it) openCtxMenu(focusPanel, focusIdx, true);
    else closeCtxMenu();
  }, 80);
}

function setModFocus(wIdx, mIdx) {
  focusMode = 'mod'; modFocusWeapon = wIdx; modFocusSlot = mIdx;
  leftNavCol = mIdx % 2; // 0 = BAR/GRI col, 1 = SCO/STO col
  closeCtxMenu();
  renderAllFocus();
  updateModFocusPanel();
}

function renderAllFocus() {
  [...panels.left, ...panels.backpack, ...panels.crate].forEach(el => el && el.classList.remove('focused'));
  modSlotEls.forEach(row => row.forEach(el => el && el.classList.remove('focused')));
  if (focusMode === 'main') {
    panels[focusPanel]?.[focusIdx]?.classList.add('focused');
    hideModFocusPanel();
  } else {
    modSlotEls[modFocusWeapon]?.[modFocusSlot]?.classList.add('focused');
    updateModFocusPanel();
  }
}

// ── MOD FOCUS PANEL ─────────────────────────────────────

function updateModFocusPanel() {
  const panel    = document.getElementById('mod-focus-panel');
  const wIdx     = modFocusWeapon, mIdx = modFocusSlot;
  const mod      = weaponModSlots[wIdx][mIdx];
  const rc       = mod ? RARITY_COLORS[mod.rarity || 'common'] : 'var(--border-default)';
  const anchorEl = modSlotEls[wIdx]?.[mIdx];

  document.getElementById('mfp-rarity-bar').style.background = rc;
  document.getElementById('mfp-slot-name').textContent = `WEAPON ${wIdx + 1} · ${MOD_SLOT_FULL[mIdx]}`;
  document.getElementById('mfp-icon').innerHTML = renderIcon(mod ? mod.type : 'mod', 22);

  const nameEl = document.getElementById('mfp-item-name');
  if (mod) { nameEl.textContent = mod.fullName || mod.label; nameEl.className = 'mfp-item-name'; }
  else      { nameEl.textContent = 'EMPTY SLOT';             nameEl.className = 'mfp-item-name empty'; }

  const statsEl = document.getElementById('mfp-stats');
  if (mod && mod.stats && mod.stats.length) {
    statsEl.innerHTML = mod.stats.map(s => `
      <div class="mfp-stat">
        <span class="mfp-stat-label">${s.n}</span>
        <div class="mfp-stat-track"><div class="mfp-stat-fill" style="width:${s.pct}%;background:${rc}"></div></div>
        <span class="mfp-stat-val">${s.v}</span>
      </div>`).join('');
  } else { statsEl.innerHTML = ''; }

  const actionsEl = document.getElementById('mfp-actions');
  if (mod) {
    actionsEl.innerHTML = `
      <div class="mfp-action" id="mfp-act-remove">
        ${psKey('square', 'mfp-action-key', true)}
        <span class="mfp-action-label">Remove Mod</span>
      </div>`;
    document.getElementById('mfp-act-remove').addEventListener('click', () => modToBackpack(wIdx, mIdx));
  } else {
    actionsEl.innerHTML = `
      <div class="mfp-action" id="mfp-act-add">
        ${psKey('cross', 'mfp-action-key')}
        <span class="mfp-action-label">Add Mod</span>
      </div>`;
    document.getElementById('mfp-act-add').addEventListener('click', () => openModPicker(wIdx, mIdx, anchorEl));
  }

  panel.style.display = 'flex';
  if (anchorEl) {
    const r  = anchorEl.getBoundingClientRect();
    const pw = panel.offsetWidth || 280, ph = panel.offsetHeight || 200;
    let left = r.right + 12, top = r.top - 8;
    if (left + pw > window.innerWidth  - 8) left = r.left - pw - 12;
    if (top  + ph > window.innerHeight - 8) top  = window.innerHeight - ph - 8;
    if (top < 8) top = 8;
    panel.style.left = left + 'px'; panel.style.top = top + 'px';
  }
}

function hideModFocusPanel() { document.getElementById('mod-focus-panel').style.display = 'none'; }

function modToBackpack(wIdx, mIdx) {
  const mod = weaponModSlots[wIdx][mIdx]; if (!mod) return;
  const empty = backpackItems.indexOf(null);
  if (empty !== -1) { backpackItems[empty] = mod; weaponModSlots[wIdx][mIdx] = null; saveState(); renderAll(); }
  else showToast('Backpack full');
}

// ── LEFT PANEL NAVIGATION ───────────────────────────────

function getLeftNavIdx() {
  if (focusMode === 'mod') {
    const row = Math.floor(modFocusSlot / 2);
    return modFocusWeapon * 2 + row; // W1: 0-1, W2: 2-3
  }
  if (focusPanel !== 'left') return -1;
  const map = {
    [LS.WEAPON1]: 1, [LS.WEAPON2]: 3, // weapon cards = bottom row of their weapon
    [LS.EQUIP1]:  4, [LS.SHIELD]:  4,
    [LS.CORES]:   5, [LS.CORE2]:   5,
    [LS.IMPL1]:   6, [LS.IMPL2]:   6, [LS.IMPL3]: 6,
  };
  return map[focusIdx] ?? -1;
}

function navigateLeftDown() {
  const cur = getLeftNavIdx(); if (cur === -1) return false;
  let next = cur + 1;
  while (next < NAV_LEFT_SEQ.length) {
    const entry = NAV_LEFT_SEQ[next];
    if (entry.type === 'mods-row') {
      const wLs = entry.weaponIdx === 0 ? LS.WEAPON1 : LS.WEAPON2;
      if (leftItems[wLs] && modSlotEls[entry.weaponIdx]?.length > 0) break;
      next++;
    } else break;
  }
  if (next >= NAV_LEFT_SEQ.length) return false;
  applyLeftNavEntry(NAV_LEFT_SEQ[next]);
  return true;
}

function navigateLeftUp() {
  const cur = getLeftNavIdx(); if (cur === -1) return false;
  let prev = cur - 1;
  while (prev >= 0) {
    const entry = NAV_LEFT_SEQ[prev];
    if (entry.type === 'mods-row') {
      const wLs = entry.weaponIdx === 0 ? LS.WEAPON1 : LS.WEAPON2;
      if (leftItems[wLs] && modSlotEls[entry.weaponIdx]?.length > 0) break;
      prev--;
    } else break;
  }
  if (prev < 0) return false;
  applyLeftNavEntry(NAV_LEFT_SEQ[prev]);
  return true;
}

function applyLeftNavEntry(entry) {
  if (entry.type === 'mods-row') {
    const col = Math.min(leftNavCol, 1);
    const slotIdx = entry.row * 2 + col; // row 0: 0(BAR) or 1(SCO); row 1: 2(GRI) or 3(STO)
    setModFocus(entry.weaponIdx, slotIdx);
  } else if (entry.type === 'gear-row' || entry.type === 'implants') {
    const col = Math.min(leftNavCol, entry.slots.length - 1);
    const slotLs = entry.slots[col];
    setMainFocus('left', slotLs);
    panels.left[slotLs]?.scrollIntoView({ block: 'nearest' });
  }
}

function navigateLeftHorizontal(dir) {
  const cur = getLeftNavIdx(); if (cur === -1) return false;
  const entry = NAV_LEFT_SEQ[cur];

  // Weapon card: LEFT returns to mod grid col 1
  if (focusIdx === LS.WEAPON1 || focusIdx === LS.WEAPON2) {
    if (dir === 'left') {
      const wIdx = focusIdx === LS.WEAPON1 ? 0 : 1;
      if (modSlotEls[wIdx]?.length > 0) {
        setModFocus(wIdx, 1 * 2 + 1); // STO slot (row 1, col 1)
        leftNavCol = 1;
        return true;
      }
    }
    return false; // RIGHT from weapon card: fall through to cross-panel
  }

  if (entry.type === 'gear-row' || entry.type === 'implants') {
    const slots = entry.slots;
    const ci = slots.indexOf(focusIdx);
    if (ci === -1) return false;
    if (dir === 'right' && ci < slots.length - 1) {
      leftNavCol = ci + 1; setMainFocus('left', slots[ci + 1]); return true;
    }
    if (dir === 'left' && ci > 0) {
      leftNavCol = ci - 1; setMainFocus('left', slots[ci - 1]); return true;
    }
  }
  return false;
}

// ── CROSS-PANEL NAVIGATION ──────────────────────────────

const COLS = { left:1, backpack:4, crate:3 };

function cellCenterY(panel, idx) {
  const el = panels[panel][idx]; if (!el) return 0;
  const r = el.getBoundingClientRect(); return r.top + r.height / 2;
}

function crossTo(fromPanel, fromIdx, dir) {
  let toPanel;
  if (dir === 'right') { if (fromPanel === 'left') toPanel = 'backpack'; else if (fromPanel === 'backpack') toPanel = 'crate'; else return null; }
  else                 { if (fromPanel === 'crate') toPanel = 'backpack'; else if (fromPanel === 'backpack') toPanel = 'left'; else return null; }
  const toCells = panels[toPanel]; if (!toCells.length) return null;
  const fromY   = cellCenterY(fromPanel, fromIdx);
  const cols    = COLS[toPanel];
  // Cross right → land on leftmost col; cross left → land on rightmost col
  const edgeCol = dir === 'right' ? 0 : cols - 1;
  let candidates = toCells
    .map((el, i) => ({ i, y: cellCenterY(toPanel, i) }))
    .filter(x => panels[toPanel][x.i] && x.i % cols === edgeCol);
  // Fall back to any populated cell if edge column is empty
  if (!candidates.length)
    candidates = toCells.map((el, i) => ({ i, y: cellCenterY(toPanel, i) })).filter(x => panels[toPanel][x.i]);
  candidates.sort((a, b) => Math.abs(a.y - fromY) - Math.abs(b.y - fromY));
  return candidates.length ? { panel: toPanel, idx: candidates[0].i } : null;
}

function navigate(dir) {
  if (focusMode === 'mod') {
    const col = modFocusSlot % 2;
    const row = Math.floor(modFocusSlot / 2);
    if (dir === 'right') {
      if (col === 0) { setModFocus(modFocusWeapon, row * 2 + 1); return; }
      // col 1: go to weapon card
      const wLs = modFocusWeapon === 0 ? LS.WEAPON1 : LS.WEAPON2;
      if (panels.left[wLs]) { leftNavCol = 2; setMainFocus('left', wLs); }
      return;
    }
    if (dir === 'left') {
      if (col === 1) { setModFocus(modFocusWeapon, row * 2); return; }
      return; // col 0: leftmost, do nothing
    }
    if (dir === 'down') { navigateLeftDown(); return; }
    if (dir === 'up')   { navigateLeftUp();   return; }
    return;
  }

  if (focusPanel === 'left') {
    if (dir === 'down' && navigateLeftDown()) return;
    if (dir === 'up'   && navigateLeftUp())   return;
    if ((dir === 'right' || dir === 'left') && navigateLeftHorizontal(dir)) return;
  }

  const cols = COLS[focusPanel];
  const len  = panels[focusPanel].length;
  const col  = focusIdx % cols;
  let ni = focusIdx, np = focusPanel;

  if (dir === 'up')   { const t = focusIdx - cols; if (t >= 0)  ni = t; }
  if (dir === 'down') { const t = focusIdx + cols; if (t < len) ni = t; }
  if (dir === 'right') {
    const atEnd = col === cols - 1 || focusIdx === len - 1;
    if (!atEnd) ni = focusIdx + 1;
    else { const d = crossTo(focusPanel, focusIdx, 'right'); if (d) { np = d.panel; ni = d.idx; } }
  }
  if (dir === 'left') {
    if (col > 0) ni = focusIdx - 1;
    else { const d = crossTo(focusPanel, focusIdx, 'left'); if (d) { np = d.panel; ni = d.idx; } }
  }

  if (np !== focusPanel || ni !== focusIdx) setMainFocus(np, ni);
  panels[focusPanel]?.[focusIdx]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

// ── ITEM ACTIONS ────────────────────────────────────────

function handleCrossAction(panel, idx) {
  const item = getItem(panel, idx); if (!item) return;

  // Tactical: tap X = move to backpack (install is long-press X)
  if (item.type === 'tactical') {
    if (panel === 'crate') { moveToBP(panel, idx); renderAll(); }
    else if (panel === 'left') { moveToBP(panel, idx); renderAll(); }
    // backpack: no tap action — install is long-press only
    return;
  }

  if (panel === 'crate') {
    const slot = findEmptyCompatibleSlot(item);
    if (slot !== null) moveItem(panel, idx, 'left', slot);
    else moveToBP(panel, idx);
  } else if (panel === 'backpack') {
    const slot = findEmptyCompatibleSlot(item);
    if (slot !== null) moveItem(panel, idx, 'left', slot);
    else doSwap(panel, idx); return;
  } else {
    moveToBP(panel, idx);
  }
  renderAll();
}

function findEmptyCompatibleSlot(item) {
  const typeMap = {
    weapon:  [LS.WEAPON1, LS.WEAPON2],
    equip:   [LS.EQUIP1],
    grenade: [LS.EQUIP1],
    shield:  [LS.SHIELD],
    core:    [LS.CORES, LS.CORE2],
    implant: [LS.IMPL1, LS.IMPL2, LS.IMPL3],
  };
  const candidates = typeMap[item.type || ''] || [];
  for (const si of candidates) { if (leftItems[si] === null) return si; }
  return null;
}

function moveToBP(fromPanel, fromIdx) {
  const empty = backpackItems.indexOf(null);
  if (empty !== -1) moveItem(fromPanel, fromIdx, 'backpack', empty);
}

function compatibleSlots(item) {
  const typeMap = {
    weapon:  [LS.WEAPON1, LS.WEAPON2],
    equip:   [LS.EQUIP1],
    grenade: [LS.EQUIP1],
    shield:  [LS.SHIELD],
    core:    [LS.CORES, LS.CORE2],
    implant: [LS.IMPL1, LS.IMPL2, LS.IMPL3],
  };
  return typeMap[item.type || ''] || null;
}

function allSlotsOccupied(item) {
  const slots = compatibleSlots(item);
  if (!slots) return false;
  return slots.every(si => leftItems[si] !== null);
}

function doEquip(panel, idx) {
  const item = getItem(panel, idx); if (!item) return;
  const slot = findEmptyCompatibleSlot(item);
  if (slot !== null) { moveItem(panel, idx, 'left', slot); renderAll(); }
}

function doSwap(panel, idx) {
  const item = getItem(panel, idx); if (!item) return;
  if (item.type === 'weapon') { openSwapPicker(panel, idx); return; }
  const slots = compatibleSlots(item) || [0];
  moveItem(panel, idx, 'left', slots[0]);
  renderAll();
}

function doEquipOrSwap(panel, idx) {
  const item = getItem(panel, idx); if (!item) return;
  const slot = findEmptyCompatibleSlot(item);
  if (slot !== null) { moveItem(panel, idx, 'left', slot); }
  else { doSwap(panel, idx); return; }
  renderAll();
}

function doRemove(panel, idx) { setRaw(panel, idx, null); saveState(); renderAll(); }

function moveToVault(panel, idx) {
  const item = getItem(panel, idx); if (!item) return;
  for (const sec of CRATE_ORDER) {
    const arr = crateData[sec]; if (!arr) continue;
    const si  = arr.indexOf(null);
    if (si !== -1) { arr[si] = item; setRaw(panel, idx, null); saveState(); renderAll(); return; }
  }
  // Overflow: append to appropriate section
  const secMap = { weapon:'green', tactical:'blue', ammo:'grey', consumable:'red', medkit:'red', grenade:'red', shield:'red', equip:'red', core:'red', implant:'red' };
  crateData[secMap[item.type || 'grey'] || 'grey'].push(item);
  setRaw(panel, idx, null); saveState(); renderAll();
}

// ── MOD PICKER ──────────────────────────────────────────

function getAvailableMods() {
  const mods = [];
  backpackItems.forEach((item, i) => { if (item && item.type === 'tactical') mods.push({ item, source:'backpack', sourceIdx:i, sourceLabel:'BACKPACK' }); });
  CRATE_ORDER.forEach(sec => { (crateData[sec] || []).forEach((item, si) => { if (item && item.type === 'tactical') mods.push({ item, source:'crate-'+sec, sourceIdx:si, sourceLabel:'VAULT' }); }); });
  return mods;
}

function openModPicker(weaponIdx, slotIdx, anchorEl) {
  hideModFocusPanel();
  modPickerWeaponIdx = weaponIdx; modPickerSlotIdx = slotIdx;
  modPickerItems = getAvailableMods(); modPickerFocusIdx = 0;
  const weaponName = leftItems[weaponIdx === 0 ? LS.WEAPON1 : LS.WEAPON2]?.label || `WEAPON ${weaponIdx + 1}`;
  document.getElementById('mod-modal-title').textContent = `${MOD_SLOT_FULL[slotIdx]} SLOT`;
  document.getElementById('mod-modal-sub').textContent   = `Installing on ${weaponName}`;
  const scroll = document.getElementById('mod-items-scroll'); scroll.innerHTML = '';
  if (!modPickerItems.length) {
    scroll.innerHTML = '<div class="mod-empty">No tactical items available.</div>';
  } else {
    const bp = modPickerItems.filter(m => m.sourceLabel === 'BACKPACK');
    const vt = modPickerItems.filter(m => m.sourceLabel === 'VAULT');
    if (bp.length) { const l = document.createElement('div'); l.className = 'mod-section-label'; l.textContent = 'FROM BACKPACK'; scroll.appendChild(l); bp.forEach(m => scroll.appendChild(makeModRow(m))); }
    if (vt.length) { const l = document.createElement('div'); l.className = 'mod-section-label'; l.textContent = 'FROM VAULT';    scroll.appendChild(l); vt.forEach(m => scroll.appendChild(makeModRow(m))); }
  }
  document.getElementById('mod-modal-hint').innerHTML =
    `${psKey('cross', 'mod-hint-key')} <span>Select to insert mod</span>`;

  const modal = document.getElementById('mod-modal');
  modal.classList.add('open');
  document.getElementById('mod-overlay').style.display = 'block';
  modPickerOpen = true;
  if (anchorEl) {
    const r = anchorEl.getBoundingClientRect();
    const mw = 420, mh = window.innerHeight * 0.7;
    let left = r.right + 10, top = r.top - 10;
    if (left + mw > window.innerWidth - 8)  left = r.left - mw - 10;
    if (top  + mh > window.innerHeight - 8) top  = window.innerHeight - mh - 8;
    if (top < 8) top = 8;
    modal.style.left = left + 'px'; modal.style.top = top + 'px';
  }
  renderModPickerFocus();
}

function makeModRow(m) {
  const row = document.createElement('div'); row.className = 'mod-item-row';
  row.innerHTML = `
    <div class="mod-item-icon ${m.item.rarity || 'common'}">${renderIcon(m.item.type, 20)}</div>
    <div class="mod-item-info">
      <div class="mod-item-name">${m.item.fullName || m.item.label}</div>
      <div class="mod-item-desc">${m.item.desc || ''}</div>
      <div class="mod-item-source">${m.sourceLabel}</div>
    </div>
    <span class="mod-item-val">${CR}${m.item.val}</span>`;
  row.addEventListener('click',      () => installMod(m));
  row.addEventListener('mouseenter', () => { if (inputMode !== 'mouse') return; modPickerFocusIdx = modPickerItems.indexOf(m); renderModPickerFocus(); });
  return row;
}

function renderModPickerFocus() {
  document.querySelectorAll('#mod-items-scroll .mod-item-row').forEach((r, i) => r.classList.toggle('focused', i === modPickerFocusIdx));
  document.querySelectorAll('#mod-items-scroll .mod-item-row')[modPickerFocusIdx]?.scrollIntoView({ block: 'nearest' });
}

function installMod(m) {
  weaponModSlots[modPickerWeaponIdx][modPickerSlotIdx] = m.item;
  if (m.source === 'backpack') backpackItems[m.sourceIdx] = null;
  else crateData[m.source.replace('crate-', '')][m.sourceIdx] = null;
  saveState();
  closeModPicker(); renderAll();
  setModFocus(modPickerWeaponIdx, modPickerSlotIdx);
}

function closeModPicker() {
  document.getElementById('mod-modal').classList.remove('open');
  document.getElementById('mod-overlay').style.display = 'none';
  modPickerOpen = false;
}

document.getElementById('mod-overlay').addEventListener('click', closeModPicker);
document.getElementById('mod-modal-close').addEventListener('click', closeModPicker);

// ── COMPARE PANEL ───────────────────────────────────────

/** Find the first occupied left slot that would be displaced by this item. */
function findConflictItem(item) {
  const typeMap = {
    weapon:  activeWeapon === 0 ? [LS.WEAPON1, LS.WEAPON2] : [LS.WEAPON2, LS.WEAPON1],
    equip:   [LS.EQUIP1],
    grenade: [LS.EQUIP1],
    shield:  [LS.SHIELD],
    core:    [LS.CORES, LS.CORE2],
    implant: [LS.IMPL1, LS.IMPL2, LS.IMPL3],
  };
  const slots = typeMap[item.type || ''];
  if (!slots) return null;
  for (const si of slots) { if (leftItems[si]) return leftItems[si]; }
  return null;
}

function showComparePanel(equipped, focused, anchorEl) {
  const panel = document.getElementById('compare-panel');

  // Equipped column
  document.getElementById('cmp-eqp-icon').innerHTML = renderIcon(equipped.type, 36);
  document.getElementById('cmp-eqp-name').textContent = equipped.fullName || equipped.label;
  const eqpRar = document.getElementById('cmp-eqp-rarity');
  eqpRar.textContent = (equipped.rarity || 'common').toUpperCase();
  eqpRar.style.color = RARITY_COLORS[equipped.rarity] || RARITY_COLORS.common;

  // Focused column
  document.getElementById('cmp-foc-icon').innerHTML = renderIcon(focused.type, 36);
  document.getElementById('cmp-foc-name').textContent = focused.fullName || focused.label;
  const focRar = document.getElementById('cmp-foc-rarity');
  focRar.textContent = (focused.rarity || 'common').toUpperCase();
  focRar.style.color = RARITY_COLORS[focused.rarity] || RARITY_COLORS.common;

  // Stats comparison
  const eqpStats = Object.fromEntries((equipped.stats || []).map(s => [s.n, s]));
  const focStats = Object.fromEntries((focused.stats  || []).map(s => [s.n, s]));
  const allNames = [...new Set([...Object.keys(eqpStats), ...Object.keys(focStats)])];

  document.getElementById('cmp-stats').innerHTML = allNames.map(name => {
    const e = eqpStats[name], f = focStats[name];
    const ev = e?.v ?? 0, fv = f?.v ?? 0;
    const ep = e?.pct ?? 0, fp = f?.pct ?? 0;
    const diff = fv - ev;
    const diffCls = diff > 0 ? 'cmp-better' : diff < 0 ? 'cmp-worse' : 'cmp-same';
    const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
    return `<div class="cmp-stat-row">
      <div class="cmp-bar"><div class="cmp-bar-fill eqp" style="width:${ep}%"></div></div>
      <span class="cmp-val eqp">${ev}</span>
      <span class="cmp-stat-name">${name}</span>
      <span class="cmp-val foc">${fv}</span>
      <div class="cmp-bar"><div class="cmp-bar-fill foc" style="width:${fp}%"></div></div>
      <span class="cmp-diff ${diffCls}">${diff === 0 ? '=' : diffStr}</span>
    </div>`;
  }).join('');

  panel.classList.remove('hidden');

  // Position to the left of the anchor, or right if no room
  if (anchorEl) {
    const r  = anchorEl.getBoundingClientRect();
    const pw = panel.offsetWidth  || 310;
    const ph = panel.offsetHeight || 180;
    let left = r.left - pw - 12;
    if (left < 8) left = r.right + 12;
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
    let top = r.top - ph / 2;
    if (top + ph > window.innerHeight - 8) top = window.innerHeight - ph - 8;
    if (top < 8) top = 8;
    panel.style.left = left + 'px';
    panel.style.top  = top  + 'px';
  }
}

function hideComparePanel() {
  document.getElementById('compare-panel').classList.add('hidden');
}

function hasOpenModSlot() {
  const w = leftItems[activeWeapon === 0 ? LS.WEAPON1 : LS.WEAPON2];
  if (!w) return false;
  return weaponModSlots[activeWeapon].some(s => s === null);
}

function installModDirect(item, fromPanel, fromIdx) {
  let slotIdx = weaponModSlots[activeWeapon].indexOf(null);
  // If no open slot, swap with slot 0 — displaced mod returns to source
  if (slotIdx === -1) slotIdx = 0;
  const displaced = weaponModSlots[activeWeapon][slotIdx];
  weaponModSlots[activeWeapon][slotIdx] = item;
  setRaw(fromPanel, fromIdx, displaced ?? null);
  saveState(); renderAll();
}

// ── CONTEXT MENU ────────────────────────────────────────

function buildCtxActions(panel, idx, item) {
  const acts = [];
  const occupied = allSlotsOccupied(item);
  const hasSlots = !!compatibleSlots(item);

  // Triangle actions — all items in all panels
  acts.push({ icon: psKey('triangle'), label: 'Switch Equipped Weapon', exec: () => {
    activeWeapon = activeWeapon === 0 ? 1 : 0;
    renderAll();
    const it = getItem(focusPanel, focusIdx);
    if (it && (focusPanel === 'backpack' || focusPanel === 'crate')) {
      const conflict = findConflictItem(it);
      if (conflict) { showComparePanel(conflict, it, panels[focusPanel][focusIdx]); openCtxMenu(focusPanel, focusIdx, true); }
    }
    showToast('Active: Weapon ' + (activeWeapon + 1));
  }});
  acts.push({ icon: psKey('triangle', 'act-key', true), label: 'Inspect', exec: () => {} });

  if (panel === 'crate') {
    // Vault
    if (hasSlots) {
      if (!occupied) {
        acts.push({ icon: psKey('cross'), label: 'Equip', exec: () => { doEquip(panel, idx); closeCtxMenu(); } });
      } else {
        acts.push({ icon: psKey('cross'), label: 'Move to Backpack', exec: () => { moveToBP(panel, idx); renderAll(); closeCtxMenu(); } });
        acts.push({ icon: psKey('cross', 'act-key', true), label: 'Swap', noMouse: true, exec: () => { doSwap(panel, idx); closeCtxMenu(); } });
      }
    } else {
      // Non-equippable (tactical, ammo, etc.) — tap X = move to backpack
      acts.push({ icon: psKey('cross'), label: 'Move to Backpack', exec: () => { moveToBP(panel, idx); renderAll(); closeCtxMenu(); } });
    }
    if (item.type === 'tactical' && leftItems[activeWeapon === 0 ? LS.WEAPON1 : LS.WEAPON2]) {
      acts.push({ icon: psKey('cross', 'act-key', true), label: 'Install Mod', exec: () => { installModDirect(item, panel, idx); closeCtxMenu(); } });
    }
    acts.push({ icon: psKey('square', 'act-key', true), label: 'Sell', val: `+${CR}${item.val}`, exec: () => { doRemove(panel, idx); closeCtxMenu(); } });

  } else if (panel === 'backpack') {
    // Backpack
    if (hasSlots) {
      if (!occupied) {
        acts.push({ icon: psKey('cross'), label: 'Equip', exec: () => { doEquip(panel, idx); closeCtxMenu(); } });
      } else {
        acts.push({ icon: psKey('cross'), label: 'Swap', exec: () => { doSwap(panel, idx); closeCtxMenu(); } });
      }
    }
    if (item.type === 'tactical' && leftItems[activeWeapon === 0 ? LS.WEAPON1 : LS.WEAPON2]) {
      acts.push({ icon: psKey('cross', 'act-key', true), label: 'Install Mod', exec: () => { installModDirect(item, panel, idx); closeCtxMenu(); } });
    }
    acts.push({ icon: psKey('square'), label: 'Move to Vault', exec: () => { moveToVault(panel, idx); closeCtxMenu(); } });
    acts.push({ icon: psKey('square', 'act-key', true), label: 'Sell', val: `+${CR}${item.val}`, exec: () => { doRemove(panel, idx); closeCtxMenu(); } });

  } else {
    // Loadout
    acts.push({ icon: psKey('cross'), label: 'Move to Backpack', exec: () => { moveToBP(panel, idx); renderAll(); closeCtxMenu(); } });
    acts.push({ icon: psKey('square'), label: 'Move to Vault', exec: () => { moveToVault(panel, idx); closeCtxMenu(); } });
    acts.push({ icon: psKey('square', 'act-key', true), label: 'Sell', val: `+${CR}${item.val}`, exec: () => { doRemove(panel, idx); closeCtxMenu(); } });
  }

  return acts;
}

function renderCtxActions() {
  const actEl = document.getElementById('ctx-actions');
  const visible = _ctxActions.filter(a => !(a.noMouse && inputMode === 'mouse'));
  actEl.innerHTML = visible.map((a) => `
    <div class="ctx-action">
      <div style="flex-shrink:0">${a.icon}</div>
      <div class="act-label">${a.label}</div>
      ${a.val ? `<div class="act-val">${a.val}</div>` : ''}
    </div>`).join('');
  actEl.querySelectorAll('.ctx-action').forEach((el, i) => {
    el.addEventListener('click',      () => visible[i].exec());
    el.addEventListener('mouseenter', () => { if (inputMode !== 'mouse') return; ctxActionIdx = i; renderCtxFocus(); });
  });
}

function openCtxMenu(panel, idx, auto = false) {
  const item = getItem(panel, idx); if (!item) return;
  _ctxPanel = panel; _ctxIdx = idx;
  const rc   = RARITY_COLORS[item.rarity || 'common'];
  document.getElementById('ctx-rarity-bar').style.background = rc;
  document.getElementById('ctx-icon').innerHTML = renderIcon(item.type, 22);
  document.getElementById('ctx-hdr-name').textContent = (item.rarity || 'common').toUpperCase();
  document.getElementById('ctx-hdr-name').style.color = rc;
  document.getElementById('ctx-hdr-full').textContent = item.fullName || item.label;
  document.getElementById('ctx-hdr-val').innerHTML    = `${CR}${item.val}`;
  document.getElementById('ctx-desc').textContent     = item.desc || '';
  document.getElementById('ctx-stats').innerHTML      = (item.stats || []).map(s => `
    <div class="ctx-stat">
      <div class="ctx-stat-row">
        <span class="ctx-stat-label">${s.n}</span>
        <span class="ctx-stat-val">${s.v}</span>
      </div>
      <div class="ctx-stat-track"><div class="ctx-stat-fill" style="width:${s.pct}%;background:${rc}"></div></div>
    </div>`).join('');

  _ctxActions = buildCtxActions(panel, idx, item);
  renderCtxActions();

  const menu = document.getElementById('ctx-menu');
  menu.style.display = 'block';
  const mw = menu.offsetWidth || 300, mh = menu.offsetHeight || 380;
  const srcEl = panels[panel]?.[idx];
  let left = 200, top = 80;
  if (srcEl) {
    const r = srcEl.getBoundingClientRect();
    left = r.left - mw - 10; if (left < 8) left = r.right + 10;
    if (left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
    top = r.top - 10;
    if (top + mh > window.innerHeight - 8) top = window.innerHeight - mh - 8;
    if (top < 8) top = 8;
  }
  menu.style.left = left + 'px'; menu.style.top = top + 'px';

  if (!auto) { hideComparePanel(); document.getElementById('ctx-overlay').style.display = 'block'; ctxOpen = true; }
  // Auto (hover) mode: no pre-selected action; manual open: pre-select first
  ctxActionIdx = auto ? -1 : 0; renderCtxFocus();

  // If compare panel is visible, dock it to the left of the ctx-menu
  if (auto) {
    const cmp = document.getElementById('compare-panel');
    if (!cmp.classList.contains('hidden')) {
      const cw = cmp.offsetWidth || 310, ch = cmp.offsetHeight || 200;
      let cl = left - cw - 10;
      if (cl < 8) cl = 8;
      let ct = top;
      if (ct + ch > window.innerHeight - 8) ct = window.innerHeight - ch - 8;
      if (ct < 8) ct = 8;
      cmp.style.left = cl + 'px';
      cmp.style.top  = ct + 'px';
    }
  }
}

function closeCtxMenu() {
  document.getElementById('ctx-menu').style.display = 'none';
  document.getElementById('ctx-overlay').style.display = 'none';
  ctxOpen = false;
  hideComparePanel();
}
document.getElementById('ctx-overlay').addEventListener('click', closeCtxMenu);

function renderCtxFocus() {
  document.querySelectorAll('.ctx-action').forEach((el, i) => el.classList.toggle('focused', i === ctxActionIdx));
}

function handleCtxKey(e) {
  const n = _ctxActions.length;
  if (e.key === 'ArrowDown') { e.preventDefault(); ctxActionIdx = ctxActionIdx < 0 ? 0 : (ctxActionIdx + 1) % n; renderCtxFocus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); ctxActionIdx = ctxActionIdx < 0 ? n - 1 : (ctxActionIdx - 1 + n) % n; renderCtxFocus(); }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (ctxActionIdx >= 0) _ctxActions[ctxActionIdx].exec(); }
  else if (e.key === 'Escape') closeCtxMenu();
}

// ── SWAP PICKER ──────────────────────────────────────────

function openSwapPicker(fromPanel, fromIdx) {
  swapPickerFrom = { panel: fromPanel, idx: fromIdx };
  const w1 = leftItems[LS.WEAPON1], w2 = leftItems[LS.WEAPON2];
  document.getElementById('swap-label-0').textContent = w1 ? (w1.fullName || w1.label) : '(empty)';
  document.getElementById('swap-label-1').textContent = w2 ? (w2.fullName || w2.label) : '(empty)';
  const picker = document.getElementById('swap-picker'); picker.style.display = 'block';
  const srcEl  = panels[fromPanel]?.[fromIdx];
  if (srcEl) { const r = srcEl.getBoundingClientRect(); picker.style.left = (r.right + 10) + 'px'; picker.style.top = r.top + 'px'; }
  swapPickerOpen = true;
  document.getElementById('swap-opt-0').classList.add('focused');
  document.getElementById('swap-opt-1').classList.remove('focused');
}

function closeSwapPicker() { document.getElementById('swap-picker').style.display = 'none'; swapPickerOpen = false; swapPickerFrom = null; }

function execSwapPicker(slotIdx) {
  if (!swapPickerFrom) return;
  moveItem(swapPickerFrom.panel, swapPickerFrom.idx, 'left', slotIdx === 0 ? LS.WEAPON1 : LS.WEAPON2);
  closeSwapPicker(); renderAll();
}

document.getElementById('swap-opt-0').addEventListener('click', () => execSwapPicker(0));
document.getElementById('swap-opt-1').addEventListener('click', () => execSwapPicker(1));

// ── DRAG AND DROP ───────────────────────────────────────

let dragSrc = null; // { panel, idx }

function applyDrag(el, panel, idx) {
  el.draggable = true;
  el.addEventListener('dragstart', e => {
    const item = getItem(panel, idx); if (!item) { e.preventDefault(); return; }
    dragSrc = { panel, idx };
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => el.classList.add('dragging'), 0);
    setInputMode('mouse');
  });
  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(t => t.classList.remove('drag-over'));
    dragSrc = null;
  });
  el.addEventListener('dragover', e => {
    if (!dragSrc) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    el.classList.add('drag-over');
  });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', e => {
    e.preventDefault(); e.stopPropagation();
    el.classList.remove('drag-over');
    if (!dragSrc || (dragSrc.panel === panel && dragSrc.idx === idx)) return;
    executeDrop(dragSrc.panel, dragSrc.idx, panel, idx);
  });
}

function applyDropTarget(el, panel, idx) {
  el.addEventListener('dragover', e => {
    if (!dragSrc) return;
    const item = getItem(dragSrc.panel, dragSrc.idx); if (!item) return;
    if (panel === 'left') {
      const compat = compatibleSlots(item);
      if (!compat || !compat.includes(idx)) return;
    }
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    el.classList.add('drag-over');
  });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', e => {
    e.preventDefault(); e.stopPropagation();
    el.classList.remove('drag-over');
    if (!dragSrc || (dragSrc.panel === panel && dragSrc.idx === idx)) return;
    executeDrop(dragSrc.panel, dragSrc.idx, panel, idx);
  });
}

function executeDrop(fromPanel, fromIdx, toPanel, toIdx) {
  const fromItem = getItem(fromPanel, fromIdx); if (!fromItem) return;
  if (toPanel === 'left') {
    const compat = compatibleSlots(fromItem);
    if (!compat || !compat.includes(toIdx)) return;
    const toItem = leftItems[toIdx];
    leftItems[toIdx] = fromItem;
    setRaw(fromPanel, fromIdx, toItem);
  } else {
    const toItem = getItem(toPanel, toIdx);
    setRaw(fromPanel, fromIdx, toItem);
    setRaw(toPanel, toIdx, fromItem);
  }
  saveState(); renderAll();
}

// ── KEYBOARD ────────────────────────────────────────────

document.addEventListener('keydown', e => {
  setInputMode('controller');
  if (modPickerOpen) {
    const n = modPickerItems.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); modPickerFocusIdx = (modPickerFocusIdx + 1) % n; renderModPickerFocus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); modPickerFocusIdx = (modPickerFocusIdx - 1 + n) % n; renderModPickerFocus(); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (modPickerItems[modPickerFocusIdx]) installMod(modPickerItems[modPickerFocusIdx]); }
    else if (e.key === 'Escape') closeModPicker();
    return;
  }
  if (swapPickerOpen) {
    if (e.key === 'ArrowUp')   { document.getElementById('swap-opt-0').classList.add('focused'); document.getElementById('swap-opt-1').classList.remove('focused'); }
    if (e.key === 'ArrowDown') { document.getElementById('swap-opt-1').classList.add('focused'); document.getElementById('swap-opt-0').classList.remove('focused'); }
    if (e.key === 'Enter' || e.key === ' ') execSwapPicker(document.getElementById('swap-opt-0').classList.contains('focused') ? 0 : 1);
    if (e.key === 'Escape') closeSwapPicker();
    return;
  }
  if (ctxOpen) { handleCtxKey(e); return; }

  switch (e.key) {
    case 'ArrowRight': e.preventDefault(); navigate('right'); break;
    case 'ArrowLeft':  e.preventDefault(); navigate('left');  break;
    case 'ArrowDown':  e.preventDefault(); navigate('down');  break;
    case 'ArrowUp':    e.preventDefault(); navigate('up');    break;
    case 'Enter': case ' ':
      e.preventDefault();
      if (focusMode === 'mod') {
        if (!weaponModSlots[modFocusWeapon][modFocusSlot]) {
          const el = modSlotEls[modFocusWeapon]?.[modFocusSlot]; if (el) openModPicker(modFocusWeapon, modFocusSlot, el);
        }
      } else handleCrossAction(focusPanel, focusIdx);
      break;
    case 'x': case 'X':
      e.preventDefault();
      if (focusMode === 'mod') {
        if (!weaponModSlots[modFocusWeapon][modFocusSlot]) {
          const el = modSlotEls[modFocusWeapon]?.[modFocusSlot]; if (el) openModPicker(modFocusWeapon, modFocusSlot, el);
        }
      } else {
        const it = getItem(focusPanel, focusIdx); if (!it) break;
        if (it.type === 'tactical' && !e.repeat && !kbHold.x) {
          kbHold.x = setTimeout(() => {
            kbHold.x = null;
            const w = leftItems[activeWeapon === 0 ? LS.WEAPON1 : LS.WEAPON2];
            if (w) { installModDirect(it, focusPanel, focusIdx); showToast('Mod installed'); }
          }, 500);
        } else if (it.type !== 'tactical') {
          openCtxMenu(focusPanel, focusIdx, false);
        }
      }
      break;
    case 'q': case 'Q':
      e.preventDefault();
      if (focusMode === 'mod') modToBackpack(modFocusWeapon, modFocusSlot);
      break;
    case 'v': case 'V':
      e.preventDefault();
      activeWeapon = activeWeapon === 0 ? 1 : 0; renderAll(); showToast('Active: Weapon ' + (activeWeapon + 1));
      break;
    case 'f': case 'F':
      e.preventDefault();
      if (focusMode === 'mod') { modToBackpack(modFocusWeapon, modFocusSlot); break; }
      if (!e.repeat) {
        kbHold.f = setTimeout(() => {
          kbHold.f = null;
          const it = getItem(focusPanel, focusIdx); if (!it) return;
          doRemove(focusPanel, focusIdx); showToast('Sold ' + CR + it.val);
        }, 500);
      }
      break;
    case 'Escape':
      closeCtxMenu(); hideModFocusPanel(); hideComparePanel();
      break;
  }
});

document.addEventListener('keyup', e => {
  if ((e.key === 'f' || e.key === 'F') && kbHold.f) {
    clearTimeout(kbHold.f); kbHold.f = null;
    if (focusMode !== 'mod') { moveToVault(focusPanel, focusIdx); showToast('Moved to vault'); }
  }
  if ((e.key === 'x' || e.key === 'X') && kbHold.x) {
    clearTimeout(kbHold.x); kbHold.x = null;
    // Short tap X on tactical = open ctx menu (install is hold)
    const it = getItem(focusPanel, focusIdx);
    if (it && it.type === 'tactical') openCtxMenu(focusPanel, focusIdx, false);
  }
});

// ── LOADOUT VALUE ────────────────────────────────────────

function calcLoadout() {
  const lv = leftItems.reduce((s, i) => s + (i ? i.val : 0), 0);
  const bv = backpackItems.reduce((s, i) => s + (i ? i.val : 0), 0);
  const total = lv + bv;
  document.getElementById('lv-num').innerHTML = `${CR}` + (total >= 1000 ? (total / 1000).toFixed(1) + 'k' : total);
}

// ── GAMEPAD (PS5 browser API) ────────────────────────────

const GP = { CROSS:0, CIRCLE:1, SQUARE:2, TRIANGLE:3, L2:6, R2:7, DPAD_UP:12, DPAD_DOWN:13, DPAD_LEFT:14, DPAD_RIGHT:15 };
let gpIndex = null, gpPrev = {}, gpAxisPrev = [0, 0], gpHeld = {};
const GP_DELAY = 300, GP_RATE = 120, GP_LP = 500, CIRC = 88;
let gpRaf = null, gpLpBtn = null, gpLpStart = null, gpLpFired = false;
const lpRing = document.getElementById('lp-ring'), lpProg = document.getElementById('lp-prog');

window.addEventListener('gamepadconnected',    e => { gpIndex = e.gamepad.index; showToast('Controller connected'); if (!gpRaf) gpRaf = requestAnimationFrame(gpLoop); });
window.addEventListener('gamepaddisconnected', e => { if (e.gamepad.index === gpIndex) { gpIndex = null; lpRing.style.display = 'none'; } });

function gpLoop() {
  gpRaf = requestAnimationFrame(gpLoop);
  if (gpIndex === null) return;
  const gp = navigator.getGamepads()[gpIndex]; if (!gp) return;
  const now = performance.now();
  gp.buttons.forEach((btn, i) => {
    const p = btn.pressed, w = !!gpPrev[i];
    const hasLP = [GP.CROSS, GP.SQUARE, GP.TRIANGLE].includes(i);
    if (p && !w) {
      gpHeld[i] = { since: now, lastFired: now }; gpLpFired = false;
      if (!hasLP) gpPress(i);
      if (hasLP) { gpLpBtn = i; gpLpStart = now; }
    } else if (p && w) {
      if ([GP.DPAD_UP, GP.DPAD_DOWN, GP.DPAD_LEFT, GP.DPAD_RIGHT].includes(i)) {
        const h = gpHeld[i];
        if (now - h.since > GP_DELAY && now - h.lastFired > GP_RATE) { h.lastFired = now; gpPress(i); }
      }
      if (hasLP && gpLpBtn === i && gpLpStart && !gpLpFired && (now - gpLpStart) >= GP_LP) {
        gpLpFired = true; gpLpStart = null; gpLongPress(i);
      }
    } else if (!p && w) {
      if (hasLP && !gpLpFired) gpPress(i);
      delete gpHeld[i];
      if (gpLpBtn === i) { gpLpBtn = null; gpLpStart = null; lpRing.style.display = 'none'; gpLpFired = false; }
    }
    gpPrev[i] = p;
  });
  [gp.axes[0], gp.axes[1]].forEach((val, ai) => {
    const prev = gpAxisPrev[ai];
    if (Math.abs(val) > 0.5 && Math.abs(prev) <= 0.5) gpPress(ai === 0 ? (val > 0 ? GP.DPAD_RIGHT : GP.DPAD_LEFT) : (val > 0 ? GP.DPAD_DOWN : GP.DPAD_UP));
    gpAxisPrev[ai] = val;
  });
  if (gpLpBtn !== null && gpLpStart !== null && !gpLpFired) {
    const p  = Math.min((now - gpLpStart) / GP_LP, 1);
    lpProg.style.strokeDashoffset = CIRC * (1 - p);
    const el = focusMode === 'mod' ? modSlotEls[modFocusWeapon]?.[modFocusSlot] : panels[focusPanel]?.[focusIdx];
    if (el) { const r = el.getBoundingClientRect(); lpRing.style.left = (r.left + r.width / 2 - 18) + 'px'; lpRing.style.top = (r.top + r.height / 2 - 18) + 'px'; lpRing.style.display = 'block'; }
  }
}

function gpPress(btn) {
  setInputMode('controller');
  if (modPickerOpen) {
    const n = modPickerItems.length;
    if (btn === GP.DPAD_DOWN) { modPickerFocusIdx = (modPickerFocusIdx + 1) % n; renderModPickerFocus(); }
    if (btn === GP.DPAD_UP)   { modPickerFocusIdx = (modPickerFocusIdx - 1 + n) % n; renderModPickerFocus(); }
    if (btn === GP.CROSS && modPickerItems[modPickerFocusIdx]) installMod(modPickerItems[modPickerFocusIdx]);
    if (btn === GP.CIRCLE) closeModPicker();
    return;
  }
  if (swapPickerOpen) {
    if (btn === GP.DPAD_UP)   { document.getElementById('swap-opt-0').classList.add('focused'); document.getElementById('swap-opt-1').classList.remove('focused'); }
    if (btn === GP.DPAD_DOWN) { document.getElementById('swap-opt-1').classList.add('focused'); document.getElementById('swap-opt-0').classList.remove('focused'); }
    if (btn === GP.CROSS)  execSwapPicker(document.getElementById('swap-opt-0').classList.contains('focused') ? 0 : 1);
    if (btn === GP.CIRCLE) closeSwapPicker();
    return;
  }
  if (ctxOpen) {
    if (btn === GP.DPAD_DOWN) handleCtxKey({ key: 'ArrowDown', preventDefault: () => {} });
    if (btn === GP.DPAD_UP)   handleCtxKey({ key: 'ArrowUp',   preventDefault: () => {} });
    if (btn === GP.CROSS)     handleCtxKey({ key: 'Enter',     preventDefault: () => {} });
    if (btn === GP.CIRCLE)    closeCtxMenu();
    return;
  }
  switch (btn) {
    case GP.DPAD_RIGHT: navigate('right'); break;
    case GP.DPAD_LEFT:  navigate('left');  break;
    case GP.DPAD_UP:    navigate('up');    break;
    case GP.DPAD_DOWN:  navigate('down');  break;
    case GP.CROSS:
      if (focusMode === 'mod') {
        if (!weaponModSlots[modFocusWeapon][modFocusSlot]) {
          const el = modSlotEls[modFocusWeapon]?.[modFocusSlot]; if (el) openModPicker(modFocusWeapon, modFocusSlot, el);
        }
      } else handleCrossAction(focusPanel, focusIdx);
      break;
    case GP.SQUARE:
      if (focusMode !== 'mod') { moveToVault(focusPanel, focusIdx); showToast('Moved to vault'); }
      break;
    case GP.TRIANGLE: activeWeapon = activeWeapon === 0 ? 1 : 0; renderAll(); showToast('Active: Weapon ' + (activeWeapon + 1)); break;
    case GP.L2: activeFilter = (activeFilter - 1 + FILTERS.length) % FILTERS.length; renderFilterBar(); renderVault(); renderAllFocus(); showToast('Filter: ' + FILTERS[activeFilter]); break;
    case GP.R2: activeFilter = (activeFilter + 1) % FILTERS.length; renderFilterBar(); renderVault(); renderAllFocus(); showToast('Filter: ' + FILTERS[activeFilter]); break;
  }
}

function gpLongPress(btn) {
  lpRing.style.display = 'none';
  if (focusMode === 'mod') {
    if (btn === GP.SQUARE) modToBackpack(modFocusWeapon, modFocusSlot);
    return;
  }
  const item = getItem(focusPanel, focusIdx); if (!item) return;
  if (btn === GP.CROSS) {
    if (item.type === 'tactical') {
      const w = leftItems[activeWeapon === 0 ? LS.WEAPON1 : LS.WEAPON2];
      if (w) { installModDirect(item, focusPanel, focusIdx); showToast('Mod installed'); }
    } else if (allSlotsOccupied(item)) {
      doSwap(focusPanel, focusIdx); showToast('Swapped');
    }
  }
  if (btn === GP.SQUARE) { doRemove(focusPanel, focusIdx); showToast('Sold ' + CR + item.val); }
}

function showToast(msg) {
  const t = document.getElementById('gp-toast');
  t.textContent = msg; t.style.display = 'block'; t.style.opacity = '1';
  clearTimeout(t._h); t._h = setTimeout(() => t.style.opacity = '0', 2500);
}

// ── TIMER ────────────────────────────────────────────────

let secs = 21 * 60 + 29;
setInterval(() => {
  if (secs <= 0) return; secs--;
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  document.getElementById('timer').textContent = m + ':' + s;
}, 1000);

// ── INIT ─────────────────────────────────────────────────

(function init() {
  loadState();
  renderAll();
  renderFilterBar();
  setTimeout(() => setMainFocus('backpack', 0), 200);
})();
