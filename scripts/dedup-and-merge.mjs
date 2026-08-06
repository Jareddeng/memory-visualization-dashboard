#!/usr/bin/env node
// 情报候选合并脚本：去重 + 合并 + 清理
// 纯 Node.js，冷启动可用，零 AI 依赖
import fs from "node:fs";
import path from "node:path";

const INTEL_FILE = "content/intel/clawbot_intel.json";
const CANDIDATE_DIR = "tmp";
const CANDIDATE_PREFIX = "news-candidates-";

// 标题相似度计算（字符集合重叠率）
function titleSimilarity(a, b) {
  if (!a || !b) return 0;
  const setA = new Set(a.toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]/g, ''));
  const setB = new Set(b.toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]/g, ''));
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  return intersection.size / Math.max(setA.size, setB.size);
}

// 1. 读取主情报库
let mainRaw, mainRecords;
try {
  mainRaw = JSON.parse(fs.readFileSync(INTEL_FILE, "utf8"));
  mainRecords = mainRaw.records || [];
} catch (e) {
  console.error(`无法读取主情报库: ${INTEL_FILE}`);
  process.exit(1);
}

const existingIds = new Set(mainRecords.map(r => r.id));
const existingUrls = new Set(mainRecords.map(r => r.url).filter(Boolean));
const existingTitleDate = new Set(mainRecords.map(r => (r.title?.trim() || '') + '|' + (r.date || '')).filter(Boolean));

// 2. 读取所有候选文件
const candidateFiles = fs.readdirSync(CANDIDATE_DIR)
  .filter(f => f.startsWith(CANDIDATE_PREFIX) && f.endsWith(".json"));

if (candidateFiles.length === 0) {
  console.log("没有找到候选文件，跳过合并");
  process.exit(0);
}

const candidates = [];
for (const f of candidateFiles) {
  const fpath = path.join(CANDIDATE_DIR, f);
  try {
    const raw = JSON.parse(fs.readFileSync(fpath, "utf8"));
    const records = Array.isArray(raw) ? raw : (raw.records || []);
    console.log(`  读取候选: ${f} (${records.length} 条)`);
    candidates.push(...records);
  } catch (e) {
    console.error(`  读取失败: ${f} - ${e.message}`);
  }
}

// 3. 去重（多层防御）
const newRecords = [];
const seenIdsInBatch = new Set();
const seenUrlsInBatch = new Set();
const seenTitleDateInBatch = new Set();

for (const r of candidates) {
  const id = r.id;
  const url = r.url?.trim();
  const title = r.title?.trim();
  const date = r.date;
  const titleDateKey = (title || '') + '|' + (date || '');

  // 跳过无效记录
  if (!id || !title || !date) {
    console.log(`  跳过无效记录: 缺少 id/title/date`);
    continue;
  }

  // 层1: id 重复（已有库）
  if (existingIds.has(id)) {
    console.log(`  跳过重复(id-已有库): ${id}`);
    continue;
  }

  // 层2: id 重复（批次内）
  if (seenIdsInBatch.has(id)) {
    console.log(`  跳过重复(id-批次内): ${id}`);
    continue;
  }

  // 层3: 标题+日期 重复（已有库）
  if (existingTitleDate.has(titleDateKey)) {
    console.log(`  跳过重复(标题日期-已有库): ${id}`);
    continue;
  }

  // 层4: 标题+日期 重复（批次内）
  if (seenTitleDateInBatch.has(titleDateKey)) {
    console.log(`  跳过重复(标题日期-批次内): ${id}`);
    continue;
  }

  // 层5: URL 重复（已有库）— 需要判断是聚合页还是真正重复
  if (url && existingUrls.has(url)) {
    const existing = mainRecords.find(mr => mr.url === url);
    const sim = titleSimilarity(existing?.title, title);
    if (sim > 0.6) {
      console.log(`  跳过重复(url-已有库, sim=${sim.toFixed(2)}): ${id}`);
      continue;
    } else {
      // URL是聚合页，清空URL保留记录
      console.log(`  清空URL(聚合页-已有库, sim=${sim.toFixed(2)}): ${id}`);
      r.url = "";
    }
  }

  // 层6: URL 重复（批次内）
  if (url && seenUrlsInBatch.has(url)) {
    const existingInBatch = candidates.find(c => c.url === url && seenIdsInBatch.has(c.id));
    const sim = titleSimilarity(existingInBatch?.title, title);
    if (sim > 0.6) {
      console.log(`  跳过重复(url-批次内, sim=${sim.toFixed(2)}): ${id}`);
      continue;
    } else {
      console.log(`  清空URL(聚合页-批次内, sim=${sim.toFixed(2)}): ${id}`);
      r.url = "";
    }
  }

  // 层7: 同一天+标题相似（已有库，模糊匹配）
  if (date && title) {
    const sameDaySameTopic = mainRecords.some(mr =>
      mr.date === date && mr.title && titleSimilarity(mr.title, title) > 0.5
    );
    if (sameDaySameTopic) {
      console.log(`  跳过重复(同日相似标题-已有库): ${id}`);
      continue;
    }
  }

  // 层8: 同一天+标题相似（批次内）
  if (date && title) {
    const sameDaySameTopicBatch = newRecords.some(nr =>
      nr.date === date && nr.title && titleSimilarity(nr.title, title) > 0.5
    );
    if (sameDaySameTopicBatch) {
      console.log(`  跳过重复(同日相似标题-批次内): ${id}`);
      continue;
    }
  }

  // 通过所有检查，加入新记录
  newRecords.push(r);
  seenIdsInBatch.add(id);
  if (url) seenUrlsInBatch.add(url);
  seenTitleDateInBatch.add(titleDateKey);
  existingIds.add(id);
  if (url) existingUrls.add(url);
}

// 4. 合并到主库
if (newRecords.length > 0) {
  mainRecords.push(...newRecords);
  fs.writeFileSync(INTEL_FILE, JSON.stringify(mainRaw, null, 2) + "\n");
  console.log(`\n合并完成: 新增 ${newRecords.length} 条, 总计 ${mainRecords.length} 条`);
} else {
  console.log("\n无新增记录");
}

// 5. 清理候选文件
for (const f of candidateFiles) {
  try {
    fs.unlinkSync(path.join(CANDIDATE_DIR, f));
    console.log(`  清理: ${f}`);
  } catch (e) {
    console.error(`  清理失败: ${f}`);
  }
}
