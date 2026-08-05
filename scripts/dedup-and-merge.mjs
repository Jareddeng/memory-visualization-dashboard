#!/usr/bin/env node
// 情报候选合并脚本：去重 + 合并 + 清理
// 纯 Node.js，冷启动可用，零 AI 依赖
import fs from "node:fs";
import path from "node:path";

const INTEL_FILE = "content/intel/clawbot_intel.json";
const CANDIDATE_DIR = "tmp";
const CANDIDATE_PREFIX = "news-candidates-";

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
const existingTitles = new Set(mainRecords.map(r => r.title?.trim()).filter(Boolean));

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

// 3. 去重（多层：id → url → 同一天+相似标题）
const newRecords = [];
const seenInBatch = new Set();

for (const r of candidates) {
  const id = r.id;
  const url = r.url?.trim();
  const title = r.title?.trim();
  const date = r.date;

  // 跳过无效记录
  if (!id || !title || !date) {
    console.log(`  跳过无效记录: 缺少 id/title/date`);
    continue;
  }

  // 层1: id 重复（已有库）
  if (existingIds.has(id)) {
    console.log(`  跳过重复(id): ${id}`);
    continue;
  }

  // 层2: url 重复（已有库）
  if (url && existingUrls.has(url)) {
    console.log(`  跳过重复(url): ${id}`);
    continue;
  }

  // 层3: 同一天+标题相似（已有库，简单包含匹配）
  if (date && title) {
    const sameDaySameTopic = mainRecords.some(mr =>
      mr.date === date && mr.title && (mr.title.includes(title.slice(0, 20)) || title.includes(mr.title.slice(0, 20)))
    );
    if (sameDaySameTopic) {
      console.log(`  跳过重复(同日相似标题): ${id}`);
      continue;
    }
  }

  // 层4: 批次内重复
  if (seenInBatch.has(id)) {
    console.log(`  跳过重复(批次内): ${id}`);
    continue;
  }
  seenInBatch.add(id);

  newRecords.push(r);
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
