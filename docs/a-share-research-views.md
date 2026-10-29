# A-share Research Views

Update `content/trackers/a_share_research_views.json`, then run `npm run generate:data`.
The existing dashboard Actions workflow reads this tracker and publishes it.
No Word file or complete daily report is required.

Each `issues` entry is one actual update, not a calendar-day placeholder:

- `id`: stable unique identifier. Revise the same ID for corrections; do not append a duplicate.
- `date`: actual issue date, `YYYY-MM-DD`. Weekly updates use their publication date.
- `title`: short issue headline.
- `stance`: explicit overall A-share stance only: `bullish`, `lean_bullish`, `neutral`, `lean_bearish`, `bearish`, or `unrated`.
- `topics`: independent topic cards, each with `title`, `points` (strings with optional `**bold**`), and `sources`.
- Optional `assessment`: `origin` (rating attribution), `summary` (one-sentence conclusion), `support` and `pressure` (string arrays with source attribution), and optional `notes` (data-quality caveats).
- Optional `disclaimer`: original risk disclosure, displayed below the topic cards.
- Each source has `title`, `date`, optional `authors`, and optional `url`. Omit unavailable URLs.

Do not infer a market-wide stance from a single sector recommendation. Missing or unrecognized ratings display as unrated and are excluded from the directional trend. Never invent historical issues, dates, ratings, sources, or URLs.

When the overall rating is an AI synthesis rather than an explicit institutional rating, set `assessment.origin` to identify it as AI-generated research synthesis. Do not label it an official brokerage rating. Preserve inconsistencies in supplied numbers with a visible data-quality note until checked; do not silently resolve them.

The archive sorts actual dates newest first and can filter by month. Statistics count all archived issues once, not the number of cited reports or topics. The trend keeps unrated observations as gaps rather than treating them as neutral. Source dates may be earlier than the issue date. Preserve historical wording and source dates rather than silently updating old forward-looking statements.
