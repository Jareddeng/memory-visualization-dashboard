import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const read = (url) => JSON.parse(readFileSync(url, "utf8"));
const { series } = read(new URL("../public/data/macro-calendar.json", import.meta.url));
const events = new Set(series.flatMap(({ key, year, days }) => days.map(day => `${key}:${year}-${day}`)));
const directory = new URL("../content/macro-commentary/", import.meta.url);
const nonempty = value => typeof value === "string" && value.trim().length > 0;
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const articleUrl = value => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password && url.pathname !== "/";
};

for (const file of readdirSync(directory).filter(name => name.endsWith(".json"))) {
  try {
    const item = read(new URL(file, directory));
    assert(events.has(item.eventId), "eventId is not on the calendar");
    assert.equal(file, item.eventId.replace(":", "_") + ".json", "filename must match eventId");
    const release = item.eventId.split(":")[1];
    assert(validDate(item.updatedAt) && item.updatedAt >= release, "invalid commentary date");
    if (item.officialUrl !== undefined) assert(articleUrl(item.officialUrl), "invalid official URL");
    assert(Array.isArray(item.overview) && item.overview.length && item.overview.every(nonempty), "overview is required");
    if (item.consensus !== undefined) assert(nonempty(item.consensus), "consensus must be text");
    assert(Array.isArray(item.sources) && item.sources.length, "sources are required");
    for (const source of item.sources) {
      assert(nonempty(source.institution) && nonempty(source.title), "missing source institution or title");
      assert(validDate(source.date) && source.date <= item.updatedAt, "invalid report date");
      assert(["事后点评", "发布前背景", "背景研究"].includes(source.kind), "invalid source kind");
      if (source.kind === "事后点评") assert(source.date >= release, "post-release report predates event");
      if (source.url !== undefined) assert(articleUrl(source.url), "use a direct HTTPS URL, not a site homepage");
    }
    assert(Array.isArray(item.topics) && item.topics.length, "topics are required");
    for (const topic of item.topics) {
      assert(nonempty(topic.title) && Array.isArray(topic.views) && topic.views.length, "missing topic title or views");
      for (const view of topic.views) {
        assert(nonempty(view.text) && Number.isInteger(view.source) && view.source >= 1 && view.source <= item.sources.length,
          "each view needs text and a valid 1-based source number");
      }
    }
  } catch (error) {
    throw new Error(`${file}: ${error.message}`, { cause: error });
  }
}
console.log("Macro commentary validation passed.");
