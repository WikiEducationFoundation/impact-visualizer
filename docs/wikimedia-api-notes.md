# Wikimedia API integration notes

What we learned while bringing IV's outbound HTTP path up to compliance
with Wikimedia's tightening rate-limit policy (2026-04-30 work,
companion to
`WikiEduDashboardPlayground:.claude/plans/wikimedia_429_handoff.md`).
This file lives next to the code so future sessions can avoid
re-discovering the same things.

## TL;DR

- The proximate cause of 429s during a CSV import test was **a
  silently-broken User-Agent setter** in `WikiActionApi` — IV was
  filing every Action API request as "Faraday v2.14.1", which puts it
  in Wikimedia's "unidentified" tier (10 req/min) instead of the
  compliant tier (200 req/min). Existing retry code looked correct
  but was never reached on the right path.
- The shape of `MediawikiApi::HttpError`, `Faraday::Error`, and
  `MediawikiApi::Client` all changed between the gem versions IV had
  pinned (`mediawiki_api 0.7.1` / `faraday 0.17`) and the WMF fork +
  Faraday 2 we needed for `Retry-After` access. That cascade is the
  reason **three different "looks-correct"** code paths were broken
  at once.
- The fixes are in `lib/wiki_action_api.rb`,
  `lib/wiki_rest_api.rb`, and `lib/wikimedia_pageviews_api.rb`. Other
  Wikimedia clients in IV are out of scope (Toolforge, Lift Wing — see
  §3 below).

## 1. The three Faraday-2 / mediawiki_api-0.9 footprints

When IV's Gemfile was pinned to the WMF mediawiki_api fork, Bundler
also bumped Faraday `0.17 → 2.x`. Three call-sites in
`lib/wiki_action_api.rb` silently broke from that bump alone:

### 1a. `client.respond_to?(:connection)` is false on 0.9

`MediawikiApi::Client` 0.9.0 stores its Faraday connection as `@conn`
and exposes no public `connection` accessor. The previous

```ruby
client.connection.headers[:user_agent] = Features.user_agent if client.respond_to?(:connection)
```

silently returned without setting a UA. **Symptom:** outbound requests
went out with `User-Agent: Faraday v2.14.1`, hit the unidentified
10-req/min tier, and 429d a 99-row import within seconds. Not visible
in any log — the guard turned the failure into a no-op.

Workaround: `instance_variable_get(:@conn)` until the gem grows a
public accessor (a follow-up for the WMF fork).

### 1b. `MediawikiApi::HttpError#response` is a Faraday::Response, not a hash

The fork at `expose-response-on-http-error` exposes `e.response`, but
it's the raw `Faraday::Response` object — not a hash. The previous
code was `e.response[:headers]['retry-after']`, which raises
`NoMethodError: undefined method '[]' for nil:NilClass` because
`e.response[:headers]` is nil. Ironically the crash happens *inside*
the rescue block, before the retry/sleep — so 429s manifested as
`NoMethodError`, not as throttle backoffs.

Faraday's response headers are accessed via `e.response.headers[name]`
(case-insensitive `CaseInsensitiveHash`). Use `respond_to?(:headers)`
as the guard so the code is robust if mediawiki_api ever swaps the
response type back.

### 1c. `Faraday::TooManyRequestsError` is a subclass, not `ClientError`

In Faraday 2, the `:raise_error` middleware raises the most specific
subclass for known statuses — 429 → `Faraday::TooManyRequestsError`,
which **is-a** `Faraday::ClientError` but is not the class itself. So:

```ruby
return false unless e.instance_of?(Faraday::ClientError)
```

…always returns false for a 429. The fix is `is_a?` plus a defensive
check on the specific subclass when defined. Both `WikiRestApi` and
`VisualizerToolsApi` had this exact bug; only `WikiRestApi` was
fixed (Toolforge is exempt — see §3).

## 2. UA gating and the unidentified tier

The Wikimedia rate-limit policy
(https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits) defines
tiers by req/min:

| Tier | Limit |
|---|---|
| Unidentified (no/poor UA) | 10 |
| Unauthenticated, compliant UA | 200 |
| Authenticated established editor | 2000 |
| Bot-flagged / WMCS / approved | exempt |

Empirical observations from this work:

- A request with `User-Agent: Faraday v2.14.1` falls into the
  **unidentified** tier — 429d within seconds at 3 req/sec. The UA
  doesn't have to be empty for a request to be considered
  "unidentified"; a generic library UA also qualifies.
- A descriptive UA with a contact (`iv-csv-ingest-test
  (sage@wikiedu.org)`) sustained ~4 req/sec for 99 sequential calls
  with zero throttling — and held up across a 6,484-article import
  spread over 52 minutes.
- IV's `Features.user_agent` returns `nil` when
  `VISUALIZER_USER_AGENT` is unset. **A nil UA gets 403, not 429**,
  per Wikimedia's UA-policy gate. Set the env var before any local
  test that hits real Wikimedia.

## 3. Out-of-scope clients (don't add 429 handling)

Verified during this audit; rationale lives in
`WikiEduDashboardPlayground:.claude/plans/wikimedia_429_handoff.md`
§7.

- **`lib/wiki_who_api.rb`** → `wikiwho-api.wmcloud.org` (Toolforge,
  WMCS-exempt).
- **`lib/visualizer_tools_api.rb`** → tool host (Toolforge, exempt).
- **`lib/lift_wing_api.rb`** → `api.wikimedia.org/service/lw/...`
  (Lift Wing — separate infrastructure, explicitly not yet migrated
  to the new rate-limit system as of April 2026; revisit if/when it
  migrates).
- **`lib/ores_api.rb`** → `ores.wikimedia.org`. Has no live callers
  in IV — `grep -rn "OresApi\|ores_api"` returns only the file
  itself. ORES is being phased out in favor of Lift Wing.

## 4. Validated end-to-end

Real-data CSV import test, 2026-04-30, against
`https://topic-builder.wikiedu.org/exports/topic-articles-*.csv`:

| Topic | CSV rows | Imported | Δ | 429s | Time |
|---|---|---|---|---|---|
| crispr_gene_editing | 99 | 99 | 0 | 0 | 52 s |
| apollo_11 | 699 | 697 | −2 | 0 | 5.4 m |
| educational_psychology | 929 | 923 | −6 | 0 | 8.1 m |
| hispanic-latino-stem-us | 1,936 | 1,936 | 0 | 0 | 14.7 m |
| seattle | 2,829 | 2,829 | 0 | 0 | 23.8 m |
| **total** | **6,492** | **6,484** | **−8** | **0** | **52 m** |

The `−8` rows aren't failures — they're redirect-collapses. IV's
`ImportService#import_article` calls `get_page_info` per title,
follows the redirect, and de-duplicates against the canonical title.
Examples observed:

- `Lunar Landing Training Vehicle` → `Lunar Landing Research Vehicle`
- `Confidence-based repetition` → `Spaced repetition`
- `Extrinsic motivation` → `Motivation`

These are TB-side opportunities (topic-level `resolve_redirects`
wasn't run before export), not IV bugs.

`GenerateArticleAnalyticsJob` then ran inline on `crispr_gene_editing`
(99 articles × ~13 API calls each ≈ 1,287 calls): **0 429 events**,
99/99 analytics rows created, 92/99 with non-zero pageviews and
non-null size.

`GenerateTimepointsJob` then ran inline on the same topic (after
the §5c Lift Wing auth fix): **8.7 min wall**, 14 topic_timepoints
+ 1,288 article_timepoints + 1 topic_summary written, **0 Lift Wing
failures** (vs. ≈510 in the pre-auth-fix attempt that was killed
at 38 min). 98 of the 1k+ Wikimedia Action API calls *did* hit
429s during this run — all absorbed cleanly by the new
Retry-After loop with zero downstream failures. The 429s came
from a parallel session regenerating VCR cassettes against the
same IP, not from this run's own steady-state pace; so the data
point is "the new handler holds even under externally-imposed
throttle pressure," not "our app bursts hard enough on its own
to provoke 429s."

## 5. Bugs found but not fixed (out of scope for the rate-limit branch)

### 5a. `ArticleStatsService#get_talk_page_size_at_date` nil-guard order

`app/services/article_stats_service.rb:185` logs `revision['size']`
*before* the nil-guard on line 187. When an article's talk page
exists but `get_page_revision_at_timestamp` returns nil for the
requested date, this raises `NoMethodError: undefined method '[]'
for nil:NilClass`. Caught by the method's `rescue StandardError`
on line 188, so the analytic is saved with `nil` talk_size — no
hard failure, but logs are noisy.

Repro: any article whose talk page existed at a different timestamp
than queried. Surfaced in our test on `Talk:Colossal Biosciences
dire wolf project`, `Talk:Erik J. Sontheimer`, `Talk:Innovative
Genomics Institute`, `Talk:KJ Muldoon`, `Talk:Patrick Hsu`,
`Talk:Samuel H. Sternberg`.

Fix sketch: move the log line inside the ternary, or guard with
`revision&.[]('size')`.

### 5b. `WikimediaPageviewsApi` masked 429s as zero pageviews

Pre-fix, the client did `return 0 unless response&.status == 200`,
which silently treated 429 throttles as "no pageviews data." This
produced wrong analytics that looked indistinguishable from a real
zero-pageviews article (e.g., a brand-new stub).

Fixed (commit `a630eed`) by adding a Retry-After-aware retry loop.
The damage to historical analytics computed pre-fix is unknown
without re-running. Worth a re-run on any topic whose
`topic_article_analytics` was populated before this branch lands.

### 5c. `LiftWingApi`: malformed Authorization header → 100% 401s (FIXED)

**Initial framing was wrong.** When `GenerateTimepointsJob` was run
on the 99-article crispr_gene_editing topic, **1530 retry log
lines** appeared in 38 minutes — ≈ 510 distinct
`RevisionQualityError`s × 3 retries each. The first hypothesis was
that Lift Wing was returning legitimate "can't classify" errors for
a real subset of revisions (stubs, redirects, talk pages, etc.) and
the retry loop was treating these deterministic failures as
transient.

**Actual cause.** A direct probe of Lift Wing with various
auth shapes revealed:

| Auth header | rev_id | Status | Body |
|---|---|---|---|
| IV's previous `"Authorization: Bearer #{token}"` | any | **401** | `"Jwt is not in the form of Header.Payload.Signature ..."` |
| Anonymous (header omitted) | recent en revid | **200** | full FA-grade score |
| Anonymous | very old revid (1) | **200** | "Start"-grade score |
| Anonymous | bogus revid (10^12) | **400** | `"The MW API does not have any info ..."` |

Two compounding bugs in `lib/lift_wing_api.rb`:

1. **The header *value* contained a literal `"Authorization:"`
   prefix.** The line was:

   ```ruby
   Authorization: "Authorization: Bearer #{token}"
   ```

   Faraday set the header to the string `"Authorization: Bearer
   <token>"` — i.e. the value started with `"Authorization:"`,
   which Lift Wing's gateway parses as a malformed JWT and 401s.
2. **The bearer token was nil in dev** (no `credentials.wiki.token`
   configured) and presumably in any environment that hadn't set
   it up. Even with bug 1 fixed, the value would have been
   `"Bearer "` — still invalid → still 401.

The result: every Lift Wing call 401d, the existing retry loop
treated 401 as transient (only `status == 400` is excluded), and
each call burned 3 retries × ~9 s + the actual request time before
giving up. 100% of failures were self-inflicted.

**Fix (committed on this branch).** Don't attach an Authorization
header at all when no token is configured — Lift Wing's
articlequality endpoint accepts anonymous calls cleanly, and per
this work's scoping doc Lift Wing isn't subject to the new
rate-limit policy yet. When a token *is* configured, use the
correct `"Bearer #{token}"` value (without the bogus literal
prefix). The existing `status != 400` skip-vs-retry gate is
correct for everything that's left.

**Lesson worth keeping.** A retry loop that "looks correct" on
paper can mask a 100% upstream-rejection scenario when none of
the rejected requests carry distinguishable status info into the
log. The original retry message said only "Retrying after N
seconds" — no status, no body, no clue that every retry was
hitting the same auth wall. When investigating a high-retry-rate
client, **probe the upstream directly with a known-good and a
known-bad input** before concluding anything about the retry
policy itself.

**Follow-up probe: the full deterministic-error taxonomy.** With
the auth bug fixed, we probed the articlequality endpoint
anonymously with a battery of edge-case inputs to see what
deterministic 4xx/5xx codes IV could expect to see in the wild.
Results:

| Status | Cause | Class |
|---|---|---|
| 200 | Successful classification — including very old revids, redirect revids, stub articles, redirects | success |
| 400 | `"The MW API does not have any info related to the rev-id"` (rev_id is deleted / bogus / future) | **deterministic** (real input) |
| 400 | `"Expected rev_id to be an integer"` / `"in input data"` | deterministic (programmer error) |
| 400 | `"Unrecognized request format"` / `"Input is a zero-length document"` | deterministic (programmer error) |
| 400 | `"Please verify that request input is a json dict"` | deterministic (programmer error) |
| 401 | Bad / malformed Authorization header (the bug fixed above) | deterministic |
| 404 | Model URL not found (wrong project code or typo'd model name) | deterministic (programmer error) |

**Implications for the retry gate.** All deterministic failures
the probe surfaced are 4xx. No deterministic 5xx was observed.
**The only deterministic class that can fire on real production
input is 400** — the user-supplied rev_id has since been deleted.
The other 4xx classes (401, 404) only fire on programmer error
(wrong header, wrong URL), which is a one-time configuration bug
rather than a per-revision condition. So the existing
`status != 400` skip-vs-retry gate in `make_request` is **correct
as-is** for the auth-fixed world; there's no hidden
"deterministic but not 400" class quietly burning the retry
budget.

If a future probe surfaces a real 5xx-deterministic case (e.g.,
the gateway 503ing a known-bad input), revisit. For now there's
no further classification work to do.

### 5d. Article-not-in-window analytics collapse "no data" with "real zero"

The crispr_gene_editing analytics run produced 92/99 articles
with non-zero pageviews and non-null size; the other **7 had
both `average_daily_views = 0` and `article_size = nil`**. A
direct probe of those 7 titles against the Wikipedia revisions
API showed:

```
title                                     first_revision_at
----                                      -----------------
Patrick Hsu                               2025-03-03
Woolly mouse                              2025-03-04
Samuel H. Sternberg                       2025-04-01
Colossal Biosciences dire wolf project    2025-04-07
TIGR-Tas                                  2025-05-21
Erik J. Sontheimer                        2025-12-22
KJ Muldoon                                2025-12-25
```

All 7 articles were created **after** the topic's analytics
window (`start_date=2024-01-01`, `end_date=2024-12-31`). The
pageviews REST endpoint returns 404 for these queries — there's
no data for an article that didn't exist yet. The Action API
returns no revision at the requested timestamp. Both
correctly-empty results are then squashed:

- `WikimediaPageviewsApi#get_average_daily_views` —
  `return 0 unless response&.status == 200` and
  `return 0 if items.empty?`. Both real-zero and
  no-data-in-window collapse to 0.
- `ArticleStatsService#get_article_size_at_date` — returns
  `nil` for "no revision at this date." Same for
  `get_talk_page_size_at_date` and `get_lead_section_size_at_date`.
  These are indistinguishable from a transient API hiccup
  caught by the rescue.

**This isn't a bug** — both signals (`0` views, `nil` size)
are reasonable defaults for "no information available." But
they conflate two qualitatively different cases:

1. The article existed in the window and had genuinely zero
   traffic / zero recorded talk page / etc.
2. The article didn't exist in the window at all — the data
   point is *missing*, not *zero*.

Downstream this matters when:
- The IV UI surfaces a "low pageviews" badge or "stub-sized
  article" warning. A user looking at a multi-year topic
  whose analytics window starts in 2024 shouldn't be told
  Patrick Hsu (created 2025-03) is a low-traffic article.
- A "no growth in views year-over-year" comparison treats a
  non-existent-in-prev-year article as "stagnant" rather than
  "newly created."
- Aggregate stats (e.g. average pageviews across the topic)
  are pulled down by the not-yet-existent articles' zero
  contributions.

**Possible refinement (deferred).** Distinguish the cases at
the storage layer:

- `WikimediaPageviewsApi`: when the response is 404 or
  `items.empty?`, return `nil` rather than `0`. The schema
  for `topic_article_analytics.average_daily_views` would need
  to allow nil (today the migration default is non-null).
- `ArticleStatsService.get_article_size_at_date`: distinguish
  "revision didn't exist at date" (return a sentinel like
  `:not_in_window`) from "API error" (return nil and log).
  Or carry the article's `first_revision_at` alongside the
  analytics row and let the UI infer "in window" comparison-
  time.

Either way the UI gains a third state — "no data because
not yet in scope" — separate from "zero" and "error."
Worth doing alongside the centrality-slider work that's
already on the roadmap (the same UI surface that distinguishes
"NULL centrality = unrated" from "scored 1 = peripheral" can
distinguish "NULL pageviews = pre-window" from "0 pageviews =
unread"). Keep flagged here so we don't re-rediscover this
trying to debug a "why are these articles sized 0" report
from a real user later.

## 6. Local-dev quirks (saves the next session 30 minutes)

### Postgres clusters

This dev box has **5 postgres clusters** running on different ports:

| Cluster | Port | Role status | Auth |
|---|---|---|---|
| 14 | 5432 (default) | `sage` exists | password (unknown) |
| 15 | 5433 | `sage` exists | password (unknown) |
| 16 | 5434 | no `sage` role | peer |
| 17 | 5436 | down | — |
| 18 | 5435 | created `sage` SUPERUSER | peer |

Default port 5432 routes to cluster 14, where peer auth doesn't apply
to `sage` and password auth fires. Cluster 18 is the one we set up
and use for IV dev/test.

```bash
PGHOST=/var/run/postgresql PGPORT=5435 bundle exec ...
```

`config/database.yml` reads both env vars (`ENV.fetch('PGHOST',
'localhost')`, `ENV.fetch('PGPORT', 5432)`); without that edit Rails
ignores the env and connects to TCP `localhost:5432`.

### Credentials

The repo ships only encrypted credentials for `production` and
`wmcloud`. The boot-time devise/database initializers reference
`Rails.application.credentials.oauth[:key]` and
`Rails.application.credentials.database[:name]`, which are nil in
fresh `development` mode and crash the app on boot. Solution: add a
`config/credentials/development.yml.enc` with stub values
(non-functional, just enough to satisfy `[]` access). Key file is
gitignored.

### Migration-time data references

`db:migrate` from a fresh DB hits `Wiki.default_wiki` from migration
`20240702213843`, which calls `wiki.update wikidata_site: ...` —
but the `wikidata_site` column is added by a **later** migration.
Use `db:schema:load` for fresh dev/test DBs instead of replaying
migrations. After schema-load, run `Wiki.default_wiki` once to seed
the enwiki row that other migrations would have created.

### Faraday-default UA setter

`Faraday.default_connection_options = { headers: { 'User-Agent' =>
... } }` is a cleaner way to UA-tag every Faraday client at once
(per the WikiEduDashboardPlayground handoff doc §8.2). IV currently
sets UA per-client; this audit kept the per-client structure for
minimal change. Worth a follow-up if more outbound clients accumulate.

## Pointers

- Cross-codebase rate-limit handoff:
  `WikiEduDashboardPlayground:.claude/plans/wikimedia_429_handoff.md`
- Wikimedia rate-limits policy:
  https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits
- WMF fork of mediawiki_api:
  https://github.com/WikiEducationFoundation/mediawiki-ruby-api
  (branch `expose-response-on-http-error`)
- This branch's commits:
  - `78b0586` — WikiActionApi: Retry-After (gem fork + 5s floor + 5 retries)
  - `0ad92fc` — WikiActionApi: actually set User-Agent on `@conn`
  - `a630eed` — WikiRestApi + WikimediaPageviewsApi parity
