/// <reference types="vite/client" />
import React from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

type Region = "CN" | "US";
type Series = {
  year: number; key: string; region: Region; label: string; source: string; note?: string;
  days: string[]; periodRule?: "previous-month" | "same-month"; periods?: Record<string, string>;
};
type Commentary = {
  eventId: string;
  summary: string;
  consensus?: string;
  differences?: Array<{ institution: string; view: string }>;
  sources: Array<{ institution: string; title: string; date?: string; url?: string }>;
};
type DetailedCommentary = {
  eventId: string;
  updatedAt: string;
  officialUrl?: string;
  overview: string[];
  consensus?: string;
  topics: Array<{ title: string; views: Array<{ source: number; text: string }> }>;
  sources: Array<{ institution: string; title: string; date: string; kind: string; url?: string }>;
};
const detailedCommentary = Object.values(import.meta.glob<DetailedCommentary>(
  "../content/macro-commentary/*.json", { eager: true, import: "default" },
));
export type MacroCalendarData = {
  series: Series[];
  undated: Array<{ month: string; region: Region; label: string }>;
  commentary: Commentary[];
};

const regionLabel = { CN: "中国", US: "美国" };
const beijingDate = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(new Date());
const pad = (number: number) => String(number).padStart(2, "0");
const https = (url?: string) => url?.startsWith("https://") ? url : undefined;

const topicNumber = new Intl.NumberFormat("zh-CN-u-nu-hanidec", { useGrouping: false });

function boldLeadSentence(text: string) {
  const sentenceEnd = text.search(/[。！？!?]|\.(?=\s|$)/);
  const leadLength = sentenceEnd < 0 ? text.length : sentenceEnd + 1;
  return <><strong>{text.slice(0, leadLength)}</strong>{text.slice(leadLength)}</>;
}

function CommentaryCard({ entry }: { entry: DetailedCommentary }) {
  return <div className="macro-commentary-body">
    <section><h4>数据速览</h4>
      <ul>{entry.overview.map((line, index) => <li key={index}>{line}</li>)}</ul>
    </section>
    <section><h4>核心观点</h4>
      {entry.consensus && <p><strong className="macro-consensus-label">共识：</strong>{boldLeadSentence(entry.consensus)}</p>}
      <p className={entry.consensus ? "macro-disagreement-divider" : undefined}><strong className="macro-disagreement-label">分歧</strong></p>
      {entry.topics.map((topic, index) => <div className="macro-commentary-topic" key={topic.title}>
        <h5>{topicNumber.format(index + 1)}、{topic.title}</h5>
        <ul>{topic.views.map(({source, text}) => {
          const ref = entry.sources[source - 1];
          return <li key={source}><strong>{ref.institution}</strong><sup className="macro-citation-marker" aria-label={`引用 ${source}`}>{source}</sup>：{boldLeadSentence(text)}</li>;
        })}</ul>
      </div>)}
    </section>
    <section><h4>引用</h4>
      <ol className="macro-release-sources">{entry.sources.map((source) => {
        const label = `${source.institution}｜${source.title}`;
        return <li key={label}>{https(source.url) ? <a href={source.url} target="_blank" rel="noreferrer">{label}</a> : <span>{label}</span>}
          <small>{source.date}{!https(source.url) && " · 原文链接待核实"}</small>
        </li>;
      })}</ol>
    </section>
  </div>;
}
const daysUntil = (date: string, today: string) => (Date.parse(date) - Date.parse(today)) / 86_400_000;
function releasePeriod(series: Series, day: string) {
  if (series.periods?.[day]) return series.periods[day];
  if (!series.periodRule) return undefined;
  const month = Number(day.slice(0, 2));
  const date = new Date(Date.UTC(series.year, month - (series.periodRule === "previous-month" ? 2 : 1), 1));
  return `${date.getUTCFullYear()} 年 ${date.getUTCMonth() + 1} 月`;
}
function releaseTitle(series: Series, period?: string) {
  const region = regionLabel[series.region];
  const indicator = series.label.startsWith(region) ? series.label.slice(region.length).trimStart() : series.label;
  const span = period?.match(/^\d{4}\s*年\s*(第[一二三四]季度|全年|\d+(?:–\d+)?\s*月)/)?.[1].replaceAll(" ", "");
  return span ? `${region}${span}${indicator}` : series.label;
}
const shortLabel: Record<string, string> = {
  "us-jobs": "非农", "us-cpi": "CPI", "us-pce": "PCE", "us-fed": "议息",
  "cn-prices": "CPI/PPI", "cn-pmi": "PMI", "cn-activity": "经济", "cn-credit": "社融",
};

function commentaryByEvent(data: MacroCalendarData) {
  return new Map<string, Commentary | DetailedCommentary>(
    [...data.commentary, ...detailedCommentary].map(item => [item.eventId, item]),
  );
}

export function macroCommentarySearchEntries(data: MacroCalendarData) {
  const commentary = commentaryByEvent(data);
  return data.series.flatMap(series => series.days.flatMap(day => {
    const date = `${series.year}-${day}`;
    const eventId = `${series.key}:${date}`;
    const entry = commentary.get(eventId);
    if (!entry) return [];
    const period = releasePeriod(series, day);
    const title = releaseTitle(series, period);
    const body = "overview" in entry
      ? [...entry.overview, ...entry.topics.flatMap(topic => [topic.title, ...topic.views.map(view => view.text)])]
      : [entry.summary, ...entry.differences?.flatMap(view => [view.institution, view.view]) ?? []];
    return [{ date, eventId, title, haystack: ["宏观数据点评", title, period, date, entry.consensus, ...body,
      ...entry.sources.flatMap(source => [source.institution, source.title])].join(" ") }];
  })).sort((a, b) => b.date.localeCompare(a.date));
}

export function MacroCalendar({ data, initialDate }: { data: MacroCalendarData; initialDate?: string }) {
  const today = beijingDate();
  const years = [...new Set(data.series.map(({ year }) => year))].sort((a, b) => a - b);
  const [month, setMonth] = React.useState(() => initialDate?.slice(0, 7) ?? (years.includes(Number(today.slice(0, 4))) ? today.slice(0, 7) : `${years.at(-1)}-12`));
  const [region, setRegion] = React.useState<Region | "all">("all");
  const [selected, setSelected] = React.useState(initialDate ?? "");
  const [pickerYear, setPickerYear] = React.useState<number | null>(null);
  const [choosingYear, setChoosingYear] = React.useState(false);
  const pickerYearIndex = pickerYear === null ? -1 : years.indexOf(pickerYear);
  const pickerButton = React.useRef<HTMLButtonElement>(null);
  const pickerLevel = React.useRef<HTMLButtonElement>(null);
  const details = React.useRef<HTMLElement>(null);
  const [year, monthNumber] = month.split("-").map(Number);
  const previous = new Date(Date.UTC(year, monthNumber - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 7);
  const inRange = (value: string) => years.includes(Number(value.slice(0, 4)));
  const offset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const commentary = commentaryByEvent(data);
  const events = data.series
    .filter((item) => item.year === year && (region === "all" || item.region === region))
    .flatMap((item) => item.days.filter((day) => day.startsWith(`${pad(monthNumber)}-`)).map((day) => {
      const date = `${year}-${day}`;
      const id = `${item.key}:${date}`;
      const period = releasePeriod(item, day);
      return { ...item, date, id, period, title: releaseTitle(item, period), commentary: commentary.get(id) };
    })).sort((a, b) => a.date.localeCompare(b.date));
  const undated = data.undated.filter((item) => item.month === month && (region === "all" || item.region === region));
  const selectedDay = selected.startsWith(month) ? selected
    : events.filter((event) => event.commentary && event.date <= today).at(-1)?.date
      ?? events.filter((event) => event.date <= today).at(-1)?.date ?? events[0]?.date;
  const releases = events.filter((event) => event.date === selectedDay);
  const nextDay = events.find((event) => event.date >= today)?.date;
  const nextEvents = events.filter((event) => event.date === nextDay);
  const chooseDay = (date: string) => {
    setSelected(date);
    if (window.matchMedia("(max-width: 1100px)").matches) details.current?.scrollIntoView({ block: "start" });
  };
  const changeMonth = (value: string) => { setMonth(value); setSelected(""); setPickerYear(null); };
  const stepPickerYear = (direction: -1 | 1) => {
    pickerLevel.current?.focus();
    setPickerYear(years[pickerYearIndex + direction]);
  };
  return (
    <section className="macro-calendar" aria-labelledby="macro-calendar-title">
      <header className="macro-calendar-head">
        <div><h1 id="macro-calendar-title">宏观数据点评</h1><p>北京时间 · {events.length} 项重点发布 · {events.filter((event) => event.commentary).length} 项已收录点评</p></div>
      </header>
      <div className="macro-calendar-layout">
        <div className="panel macro-calendar-board">
          <div className="macro-calendar-nav">
            <button type="button" aria-label="上个月" title="上个月" disabled={!inRange(previous)} onClick={() => changeMonth(previous)}><ChevronLeft size={18} /></button>
            <div className="macro-month-picker" onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setPickerYear(null);
            }} onKeyDown={(event) => {
              if (event.key === "Escape" && pickerYear !== null) {
                event.stopPropagation();
                if (choosingYear) {
                  pickerLevel.current?.focus();
                  setChoosingYear(false);
                  return;
                }
                setPickerYear(null);
                pickerButton.current?.focus();
              }
            }}>
              <button type="button" className="macro-month-trigger" ref={pickerButton} aria-label={`选择月份：${year}年${monthNumber}月`} aria-expanded={pickerYear !== null} onClick={() => {
                setChoosingYear(false);
                setPickerYear(pickerYear === null ? year : null);
              }}>
                {year}年{monthNumber}月 <ChevronDown size={14} aria-hidden="true" />
              </button>
              {pickerYear !== null && <div className="macro-month-popover" role="group" aria-label={choosingYear ? "选择年份" : "选择年月"}>
                <div className={`macro-month-level-nav${choosingYear ? " is-year-grid" : ""}`}>
                  {!choosingYear && <button type="button" aria-label="上一年" title="上一年" disabled={pickerYearIndex <= 0} onClick={() => stepPickerYear(-1)}><ChevronLeft size={14} aria-hidden="true" /></button>}
                  <button type="button" ref={pickerLevel} className="macro-month-level" aria-label={choosingYear ? "返回月份" : "切换年份"} onClick={() => setChoosingYear(!choosingYear)}>
                    {choosingYear ? <><ChevronLeft size={14} aria-hidden="true" /> 返回月份</> : `${pickerYear}年`}
                  </button>
                  {!choosingYear && <button type="button" aria-label="下一年" title="下一年" disabled={pickerYearIndex >= years.length - 1} onClick={() => stepPickerYear(1)}><ChevronRight size={14} aria-hidden="true" /></button>}
                </div>
                {choosingYear ? <div className="macro-month-options macro-year-options">
                  {years.map((value) => <button type="button" key={value} aria-pressed={pickerYear === value} onClick={() => {
                    pickerLevel.current?.focus();
                    setPickerYear(value);
                    setChoosingYear(false);
                  }}>{value}年</button>)}
                </div> :
                <div className="macro-month-options">
                  {Array.from({ length: 12 }, (_, i) => {
                    const value = `${pickerYear}-${pad(i + 1)}`;
                    return <button type="button" key={value} aria-pressed={value === month} onClick={() => {
                      pickerButton.current?.focus();
                      changeMonth(value);
                    }}>{i + 1}月</button>;
                  })}
                </div>}
              </div>}
            </div>
            <button type="button" aria-label="下个月" title="下个月" disabled={!inRange(next)} onClick={() => changeMonth(next)}><ChevronRight size={18} /></button>
          </div>
          {nextDay && <button type="button" className="macro-calendar-next" onClick={() => chooseDay(nextDay)}>
            <span>{nextEvents.map((event) => event.title).join("、")}</span>
            <strong>{nextDay === today ? "今日发布" : `还有 ${daysUntil(nextDay, today)} 天`}</strong>
          </button>}
          <div className="macro-calendar-legend" role="group" aria-label="地区图例">
            {(["all", "CN", "US"] as const).map((key) => <button type="button" key={key} aria-pressed={region === key} onClick={() => { setRegion(key); setSelected(""); }}>
              {key !== "all" && <i className={key} aria-hidden="true" />}{key === "all" ? "全部" : regionLabel[key]}
            </button>)}
          </div>
          <div className="macro-calendar-grid">
            {["一", "二", "三", "四", "五", "六", "日"].map((day) => <span className="macro-calendar-weekday" key={day}>周{day}</span>)}
            {Array.from({ length: offset }, (_, i) => <span className="macro-calendar-blank" key={`blank-${i}`} aria-hidden="true" />)}
            {Array.from({ length: count }, (_, i) => {
              const date = `${month}-${pad(i + 1)}`;
              const rows = events.filter((event) => event.date === date);
              const visibleRows = rows.length > 2 ? rows.slice(0, 1) : rows;
              if (!rows.length) return <span key={date} className="macro-calendar-day is-empty" aria-current={date === today ? "date" : undefined}>{i + 1}</span>;
              return <button type="button" key={date} className="macro-calendar-day" aria-current={date === today ? "date" : undefined} aria-pressed={selectedDay === date} aria-label={`${date}：${rows.map((event) => event.label).join("、")}`} onClick={() => chooseDay(date)}>
                <span className="macro-calendar-day-number">{i + 1}<span className="macro-calendar-dots" aria-hidden="true">{rows.map((event) => <i className={event.region} key={event.id} />)}</span></span>
                {visibleRows.map((event) => <span key={event.id} className={`macro-calendar-event ${event.region}`} title={event.label}>{shortLabel[event.key] ?? event.label}{event.commentary && <span className="macro-calendar-reviewed" aria-hidden="true" />}</span>)}
                {visibleRows.length < rows.length && <span className="macro-calendar-more" title={rows.slice(visibleRows.length).map((event) => event.label).join("、")}>+{rows.length - visibleRows.length} 项</span>}
              </button>;
            })}
          </div>
          <ul className="macro-calendar-agenda" aria-label="本月重点发布">
            {events.map((event) => <li key={event.id}><button type="button" aria-pressed={selectedDay === event.date} onClick={() => chooseDay(event.date)}><time dateTime={event.date}>{event.date.slice(5)}</time><span>{event.title}</span>{event.commentary ? <strong>已有点评</strong> : event.date >= today ? <strong>{event.date === today ? "今日" : `${daysUntil(event.date, today)} 天后`}</strong> : null}</button></li>)}
          </ul>
          {undated.length > 0 && <div className="macro-calendar-undated"><strong>日期待确认</strong>{undated.map((event) => <span key={event.label}>{event.label}</span>)}</div>}
        </div>
        <section className="panel macro-calendar-details" ref={details} aria-label="当日数据与点评">
          <h2>当日数据点评</h2>
          <p className="macro-calendar-meta">{selectedDay ?? month} · {releases.length ? `${releases.length} 项数据发布` : "暂无重点发布记录"}</p>
          {releases.map((event) => <article className="macro-release" id={`macro-commentary-${event.id}`} key={event.id}>
            <div className="macro-release-head"><h3>{event.title}</h3><span>{event.commentary ? "已有点评" : event.date > today ? "计划发布" : "暂无点评"}</span></div>
            {event.period && <p className="macro-release-period">数据所属期：{event.period}</p>}
            <p className="macro-calendar-meta">数据发布日期：{event.date} · {regionLabel[event.region]}</p>
            {event.commentary && "updatedAt" in event.commentary && <p className="macro-calendar-meta">点评整理：{event.commentary.updatedAt}</p>}
            {event.note && <p className="macro-calendar-meta">{event.note}</p>}
            {!event.commentary && <p className="macro-release-empty">{event.date > today ? "数据尚未发布。" : "暂未收录券商点评。"}</p>}
            {event.commentary && ("overview" in event.commentary ? <CommentaryCard entry={event.commentary} /> : <>
              <p>{event.commentary.summary}</p>
              {event.commentary.consensus && <p><strong>机构共识：</strong>{boldLeadSentence(event.commentary.consensus)}</p>}
              {event.commentary.differences?.length ? <div><strong>机构分歧</strong><ul>{event.commentary.differences.map(({ institution, view }) => <li key={institution}><strong>{institution}：</strong>{view}</li>)}</ul></div> : null}
              <ul className="macro-release-sources">{event.commentary.sources.map((source) => <li key={`${source.institution}:${source.title}`}>
                {https(source.url) ? <a href={source.url} target="_blank" rel="noreferrer">{source.institution} · {source.title}</a> : <span>{source.institution} · {source.title}</span>}
                <small>{source.date ? `研报日期：${source.date}` : "研报日期未核实"}</small>
              </li>)}</ul>
            </>)}
          </article>)}
        </section>
      </div>
    </section>
  );
}
