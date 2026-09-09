import fs from 'node:fs';
import assert from 'node:assert/strict';
import rules from '../src/intel-duplicate-rules.mjs';
import { assertUniqueIntelUrls } from '../src/intel-quality.mjs';
const read = p => JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const write = (p,v) => fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const base='data/archive/intel/repair-2026-09-07/';
const target='data/archive/intel/review-2026-09-09/';
assert(!fs.existsSync(target),'Review already applied; do not replay against modified data');
const pub=read('content/intel/clawbot_intel.json'), pending=read(base+'pending.json'), merged=read(base+'merged.json');
const plans=read('data/pending-review-decisions-20260909.json');
const originals=new Map(pending.records.map(r=>[r.id,r]));
assert.equal(pub.records.length,472);assert.equal(pending.records.length,152);
const snapshot={published:structuredClone(pub),pending:structuredClone(pending),merged:structuredClone(merged)};
const wrongId='2026-07-06-sk-hynix-adr-bookbuilding-start';
const wrong=pub.records.find(r=>r.id===wrongId);assert(wrong);
pub.records=pub.records.filter(r=>r.id!==wrongId);
const removed=new Set();
for(const p of plans){
 const old=originals.get(p.id);assert(old,p.id);
 if(p.status==='pending')continue;
 removed.add(p.id);
 if(p.status==='merge'){
  merged.records.push({...old,merged_into:p.keep,review_reason:p.note});
  rules.push({keep:p.keep,duplicates:[p.id],reason:p.note});
 }else{
  assert(p.title&&p.summary&&p.date&&p.url,p.id);
  const row={...old,...Object.fromEntries(['title','summary','date','url','source'].filter(k=>p[k]).map(k=>[k,p[k]]))};
  for(const k of ['review_reason','review_date','review_note','transmission_path','pricing_status'])delete row[k];
  row.confidence='medium';row.action='watch';row.impact='neutral';row.reaction_type='archive';
  row.review_note='2026-09-09原文复核：'+p.note;
  pub.records.push(row);
 }
}
pending.records=pending.records.filter(r=>!removed.has(r.id)).map(r=>{
 const p=plans.find(p=>p.id===r.id);
 return p?{...r,review_reason:p.note,review_evidence_url:p.url||''}:r;
});
pending.records.push({...wrong,review_reason:'2026-09-09核对发现：财联社2417573实际为A股存储板块高开，与ADR簿记建档不对应；未找到足以支持原事件时点的对应原文。'});
assertUniqueIntelUrls(pub.records);
const all=[...pub.records,...pending.records,...merged.records];
assert.deepEqual(all.map(r=>r.id).sort(),read(base+'before.json').records.map(r=>r.id).sort());
for(const p of plans.filter(x=>x.status==='merge'))assert(pub.records.some(r=>r.id===p.keep));
fs.mkdirSync(target,{recursive:true});
write(target+'before.json',snapshot);
write(target+'decisions.json',{reviewed_at:'2026-09-09',scope:'人工原文核对；未恢复条目不等于虚假，未读取付费全文的条目只使用公开摘要。',decisions:plans,quarantined:[{id:wrongId,reason:pending.records.at(-1).review_reason}],counts:{restored:plans.filter(x=>x.status==='restore').length,merged:plans.filter(x=>x.status==='merge').length,quarantined:1,published:pub.records.length,pending:pending.records.length,archived_duplicates:merged.records.length}});
write('content/intel/clawbot_intel.json',pub);write(base+'pending.json',pending);write(base+'merged.json',merged);
fs.writeFileSync('src/intel-duplicate-rules.mjs','// Reviewed event identities; do not infer duplicates from title similarity alone.\nexport default '+JSON.stringify(rules,null,2)+';\n');
console.log(read(target+'decisions.json').counts);

