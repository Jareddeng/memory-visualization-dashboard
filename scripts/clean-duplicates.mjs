#!/usr/bin/env node
// 清理情报库内部重复记录
// 策略：保留首次出现，后续重复根据情况删除或清空URL
import fs from "node:fs";

const INTEL_FILE = "content/intel/clawbot_intel.json";
const BACKUP_FILE = "content/intel/clawbot_intel.json.bak." + Date.now();

const data = JSON.parse(fs.readFileSync(INTEL_FILE, "utf8"));
const records = data.records || [];

console.log(`原始记录数: ${records.length}`);

// 追踪已见的URL和ID
const seenUrls = new Map(); // url -> first index
const seenIds = new Map();  // id -> first index
const seenTitleDate = new Map(); // "title|date" -> first index

const toRemove = new Set();
const toClearUrl = new Set();

records.forEach((r, idx) => {
  const url = r.url?.trim();
  const id = r.id?.trim();
  const title = r.title?.trim();
  const date = r.date;
  const titleDateKey = (title || '') + '|' + (date || '');

  // 1. ID重复 → 删除后面的
  if (id) {
    if (seenIds.has(id)) {
      console.log(`  [删除] ID重复 #${idx} (${id})，首次在 #${seenIds.get(id)}`);
      toRemove.add(idx);
      return;
    }
    seenIds.set(id, idx);
  }

  // 2. 标题+日期完全相同 → 删除后面的
  if (title && date) {
    if (seenTitleDate.has(titleDateKey)) {
      console.log(`  [删除] 标题日期重复 #${idx} (${title.substring(0, 30)}...)`);
      toRemove.add(idx);
      return;
    }
    seenTitleDate.set(titleDateKey, idx);
  }

  // 3. URL重复处理
  if (url) {
    if (seenUrls.has(url)) {
      const firstIdx = seenUrls.get(url);
      const first = records[firstIdx];
      
      // 如果标题相似度很高（>60%字符重叠），认为是真正重复 → 删除
      const similarity = calculateSimilarity(first.title || '', title || '');
      if (similarity > 0.6) {
        console.log(`  [删除] URL+标题相似重复 #${idx} (sim=${similarity.toFixed(2)}) ${title?.substring(0, 30)}`);
        toRemove.add(idx);
        return;
      }
      
      // 否则是聚合页被多条新闻共用 → 清空后面记录的URL，保留记录
      console.log(`  [清空URL] 聚合页共用 #${idx} (URL已被#${firstIdx}使用) ${title?.substring(0, 30)}`);
      toClearUrl.add(idx);
    } else {
      seenUrls.set(url, idx);
    }
  }
});

function calculateSimilarity(a, b) {
  const setA = new Set(a.toLowerCase().split(''));
  const setB = new Set(b.toLowerCase().split(''));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  return intersection.size / Math.max(setA.size, setB.size);
}

// 执行修改
let removed = 0;
let cleared = 0;

// 先处理清空URL（从后往前避免索引偏移问题）
const clearIndices = Array.from(toClearUrl).sort((a, b) => b - a);
for (const idx of clearIndices) {
  records[idx].url = "";
  cleared++;
}

// 再删除记录（从后往前）
const removeIndices = Array.from(toRemove).sort((a, b) => b - a);
for (const idx of removeIndices) {
  records.splice(idx, 1);
  removed++;
}

// 备份原文件
fs.copyFileSync(INTEL_FILE, BACKUP_FILE);
console.log(`\\n已备份原文件到: ${BACKUP_FILE}`);

// 写入清理后的数据
fs.writeFileSync(INTEL_FILE, JSON.stringify(data, null, 2) + "\n");

console.log(`清理完成: 删除 ${removed} 条, 清空URL ${cleared} 条, 剩余 ${records.length} 条`);

// 验证：再次检查是否还有重复
const checkUrls = new Map();
const checkIds = new Map();
let remainingDups = 0;
records.forEach((r, idx) => {
  if (r.id && checkIds.has(r.id)) remainingDups++;
  if (r.id) checkIds.set(r.id, idx);
  if (r.url && checkUrls.has(r.url)) remainingDups++;
  if (r.url) checkUrls.set(r.url, idx);
});
console.log(`验证: 剩余重复数 = ${remainingDups}`);
