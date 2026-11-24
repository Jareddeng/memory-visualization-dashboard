import fs from 'node:fs';
import { saveCleanLibrary } from './clean-intel-library.mjs';
import { validIntelUrl } from '../src/intel-quality.mjs';

const raw = JSON.parse(fs.readFileSync('content/intel/clawbot_intel.json', 'utf8'));
const files = fs.existsSync('tmp') ? fs.readdirSync('tmp').filter(f => f.startsWith('news-candidates-') && f.endsWith('.json')).sort() : [];

const candidates = files.flatMap(f => {
  const value = JSON.parse(fs.readFileSync('tmp/' + f, 'utf8'));
  return Array.isArray(value) ? value : value.records || [];
});

// ---------- shared text helpers ----------
const norm = s => String(s || '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '');
function ngrams(s, n = 2) {
  const t = norm(s);
  const set = new Set();
  for (let i = 0; i < t.length - n + 1; i++) set.add(t.slice(i, i + n));
  return set;
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
function containment(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / Math.min(a.size, b.size);
}
const daysBetween = (a, b) => Math.round(Math.abs(new Date(a) - new Date(b)) / 86400000);

// ---------- entity anchors + event nouns (event-level dedup, catches same event via different outlets) ----------
const ENTITY_GROUPS = [
  ['三星', 'samsung'], ['sk海力士', 'skhynix', 'hynix', '海力士', 'skhy'],
  ['美光', 'micron'], ['铠侠', 'kioxia'], ['闪迪', 'sandisk', 'sndk'],
  ['西数', '西部数据', 'wdc', 'westerndigital'], ['希捷', 'seagate', 'stx'],
  ['英特尔', 'intel'], ['英伟达', 'nvidia', '黄仁勋'], ['amd', '超威'],
  ['苹果', 'apple'], ['台积电', 'tsmc'], ['东芝', 'toshiba'],
  ['长江存储', 'ymtc', '长存'], ['长鑫', 'cxmt', '长鑫存储'],
  ['群联', 'phison'], ['江波龙', 'longsys'], ['佰维', 'biwin'],
  ['兆易创新', 'gigadevice'], ['普冉', 'puya'], ['澜起', 'montage'],
  ['大普微', 'dapustor'], ['慧荣', 'siliconmotion'],
  ['中芯国际', 'smic'], ['asml', '阿斯麦'], ['应用材料', 'appliedmaterials'],
  ['泛林', 'lamresearch'], ['东京电子', 'tokyoelectron'], ['besi'],
  ['谷歌', 'google', 'alphabet'], ['微软', 'microsoft'], ['meta'],
  ['openai'], ['特斯拉', 'tesla'], ['华为', 'huawei'], ['小米', 'xiaomi'],
  ['软银', 'softbank', '孙正义'], ['trendforce', '集邦'], ['伯恩斯坦', 'bernstein'],
];
// noun groups: two titles sharing ANY member of the same group count as sharing the event noun
const NOUN_GROUPS = [
  ['长协', '长约', '长期协议', '长期供货', 'lta'],           // 0
  ['锁定', '售罄'],                                            // 1
  ['债转股', '转股', '第一大股东'],                            // 2
  ['任命', '负责人'],                                          // 3
  ['清仓', '做空'],                                            // 4
  ['回购', '股东回报', '特别股息', '股息', '分红'],            // 5
  ['涨价', '合约价', '现货价', '价格上限'],                    // 6
  ['财报', '营收', '营业利润'],                                // 7
  ['短缺', '缺货', '库存'],                                    // 8
  ['暴跌', '重挫', '抛售', '熔断', '崩跌'],                    // 9
  ['收购', '并购'],                                            // 10
  ['量产', '投产', '扩产', '建厂'],                            // 11
  ['目标价', '评级'],                                          // 12
];
// groups distinctive enough that (1 company anchor + same strong group + <=2d) almost always means same event
const STRONG_GROUPS = new Set([0, 1, 2, 3, 4, 5, 8]);
const normKey = k => norm(k);
const groupsOf = t => {
  const nt = norm(t);
  const hit = new Set();
  NOUN_GROUPS.forEach((members, i) => {
    if (members.some(m => nt.includes(normKey(m)))) hit.add(i);
  });
  return hit;
};
const anchorsOf = t => {
  const nt = norm(t);
  const found = new Set();
  ENTITY_GROUPS.forEach((group, i) => {
    if (group.some(k => nt.includes(normKey(k)))) found.add(i);
  });
  return found;
};

// ---------- market session detection (one move record per market per day) ----------
const MOVE_RE = /涨|跌|重挫|暴跌|抛售|走低|拉升|反弹|收涨|收跌|盘前|盘后|崩跌|surge|plunge|selloff|rally|drop|rise|fall|gain|decline/i;
function marketScope(t) {
  const nt = norm(t);
  if (/全球/.test(nt)) return 'global';
  if (/亚太|亚洲|日韩/.test(nt)) return 'asia';
  if (/美股|美国|道指|纳指|纳斯达克|费半|费城半导体|标普/.test(nt)) return 'us';
  if (/韩股|韩国|kospi|首尔|韩元/.test(nt)) return 'kr';
  if (/日经|日本/.test(nt)) return 'jp';
  if (/台股|台湾|taiex/.test(nt)) return 'tw';
  if (/a股|科创|沪深|上证/.test(nt)) return 'cn';
  return '';
}
const SCOPE_COVER = { global: ['global', 'asia', 'us', 'kr', 'jp', 'tw', 'cn'], asia: ['asia', 'kr', 'jp', 'tw', 'cn'] };
const scopeOverlap = (a, b) => a === b || (SCOPE_COVER[a] || []).includes(b) || (SCOPE_COVER[b] || []).includes(a);

// ---------- precompute library signatures ----------
const library = raw.records || [];
const libSigs = library.map(r => {
  const title = String(r.title || '');
  return {
    id: r.id, date: r.date,
    titleNorm: norm(title),
    titleGrams: ngrams(title),
    bodyGrams: ngrams(`${title} ${String(r.summary || '').slice(0, 120)}`),
    anchors: anchorsOf(title),
    groups: groupsOf(title),
    move: MOVE_RE.test(title),
    scope: marketScope(title),
  };
});

function findSameEvent(c) {
  const cTitle = String(c.title || '');
  const cGrams = ngrams(cTitle);
  const cBody = ngrams(`${cTitle} ${String(c.summary || '').slice(0, 120)}`);
  const cAnchors = anchorsOf(cTitle);
  const cGroups = groupsOf(cTitle);
  const cStrong = [...cGroups].filter(g => STRONG_GROUPS.has(g));
  const cMove = MOVE_RE.test(cTitle);
  const cScope = marketScope(cTitle);
  let best = null;
  for (const lib of libSigs) {
    const dd = daysBetween(c.date, lib.date);
    if (dd > 3) continue;
    const sharedAnchors = [...cAnchors].filter(a => lib.anchors.has(a)).length;
    const sharedGroups = [...cGroups].filter(g => lib.groups.has(g)).length;
    const sharedStrong = cStrong.some(g => lib.groups.has(g));
    const contT = containment(cGrams, lib.titleGrams);
    const jacT = jaccard(cGrams, lib.titleGrams);
    const contB = containment(cBody, lib.bodyGrams);
    let hit = null;
    if (sharedAnchors >= 2 && sharedGroups >= 1 && dd <= 2) {
      hit = `anchors:${sharedAnchors}/groups:${sharedGroups}`;
    } else if (sharedAnchors >= 2 && dd <= 1 && contT >= 0.45) {
      hit = `anchors:${sharedAnchors}/cont:${contT.toFixed(2)}`;
    } else if (sharedAnchors >= 1 && sharedGroups >= 1 && dd <= 1 && contT >= 0.35) {
      hit = `anchor+group cont:${contT.toFixed(2)}`;
    } else if (sharedAnchors >= 1 && sharedStrong && dd <= 2) {
      hit = `anchor+strong-group dd:${dd}`;
    } else if (dd === 0 && (contT >= 0.55 || jacT >= 0.45 || contB >= 0.55)) {
      hit = `title-match jac:${jacT.toFixed(2)} cont:${contT.toFixed(2)}`;
    } else if (dd <= 2 && (contT >= 0.72 || jacT >= 0.6 || contB >= 0.7)) {
      hit = `near-title-match jac:${jacT.toFixed(2)} cont:${contT.toFixed(2)}`;
    } else if (dd <= 3 && contT >= 0.8) {
      hit = `repost cont:${contT.toFixed(2)}`;
    } else if (dd === 0 && sharedGroups >= 1 && contT >= 0.4) {
      hit = `same-day topic cont:${contT.toFixed(2)}`;
    } else if (dd === 0 && cMove && lib.move && sharedGroups >= 1 && (sharedAnchors >= 1 || (cScope && lib.scope && scopeOverlap(cScope, lib.scope)))) {
      hit = `same-session move${cScope && lib.scope ? ' ' + (cScope === lib.scope ? cScope : cScope + '/' + lib.scope) : ''}`;
    }
    if (hit) {
      const score = Math.max(contT, jacT, contB, sharedAnchors / 10);
      if (!best || score > best.score) best = { id: lib.id, hit, score: +score.toFixed(2) };
    }
  }
  return best;
}

// ---------- price-move materiality: pure daily moves below 5% are not intel ----------
const PCT_RE = /(\d+(?:\.\d+)?)\s*%/g;
const MILESTONE_RE = /涨停|熔断|市值|历史新高|历史新低|重回|突破|首破|破[万千亿]|新高|新低/;
function belowMaterialityThreshold(r) {
  const t = String(r.title || '').normalize('NFKC');
  if (!MOVE_RE.test(t)) return false;
  if (MILESTONE_RE.test(t)) return false;
  const pcts = [...t.matchAll(PCT_RE)].map(m => parseFloat(m[1]));
  if (pcts.length) return Math.max(...pcts) < 5;
  // title has no explicit % -> judge by summary numbers
  const s = String(r.summary || '').normalize('NFKC');
  const sPcts = [...s.matchAll(PCT_RE)].map(m => parseFloat(m[1]));
  return sPcts.length > 0 && Math.max(...sPcts) < 5;
}

const valid = [];
const rejected = [];
for (const r of candidates) {
  const errors = [];
  if (!r.id) errors.push('missing id');
  if (!r.title) errors.push('missing title');
  if (!r.date) errors.push('missing date');
  if (!r.summary) errors.push('missing summary');
  const urlValid = validIntelUrl(r.url);
  if (!urlValid) errors.push('missing or invalid url');

  if (errors.length) {
    rejected.push({ id: r.id || '(no-id)', title: r.title || '(no-title)', reason: errors.join(', ') });
    continue;
  }
  if (belowMaterialityThreshold(r)) {
    rejected.push({ id: r.id, title: r.title, reason: 'daily price move below 5% materiality threshold — not intel' });
    continue;
  }
  const dup = findSameEvent(r);
  if (dup) {
    rejected.push({ id: r.id, title: r.title, reason: `same-event as existing ${dup.id} [${dup.hit}] — drop, or edit the existing record in place` });
    continue;
  }
  valid.push(r);
}

if (rejected.length) {
  console.error(`[dedup-and-merge] REJECTED ${rejected.length} candidate(s):`);
  for (const r of rejected) {
    console.error(`  - ${r.id}: ${r.reason}\n    ${r.title}`);
  }
}

if (!valid.length) {
  console.log('[dedup-and-merge] No valid candidates to merge.');
  process.exit(0);
}

console.log(`[dedup-and-merge] Merging ${valid.length} candidate(s)...`);
saveCleanLibrary({ ...raw, records: [...library, ...valid] }, 'merge');
