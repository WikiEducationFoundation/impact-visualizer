# Plan — Batch the topic data generation pipeline

## Goal

Cut wall-clock time of a topic build by 10×+ by replacing
one-article-at-a-time fan-out with batched MediaWiki Action API requests,
and by lifting article-scoped analytics out of `(topic, article)` storage
so we don't re-fetch the same article every time it joins a new topic.

## Out of scope

- **LiftWing.** Only takes one rev_id per call. Stays single-rev.
- **ORES.** Phased out, no live callers (per
  `docs/wikimedia-api-notes.md` §3).
- **Pageviews REST endpoint.** Strictly per-article; no batch shape
  exists. Stays single-article.
- **Backlinks count, unique editors count, WikiWho.** Either no batch
  shape, or batch shape exists but pagination explodes. Stays as-is.

## Non-goals

- No raising of `THREADS_COUNT`. The current rate-limit story works;
  batching reduces total calls without changing concurrency.
  Concurrency tuning is a follow-up.
- No replacing WikiWho with diff-based attribution. Big project,
  separate plan.

---

## Phase 1 — Make `WikiActionApi` array-aware

**Why first.** Phases 2 and 3 both depend on this. It's a mechanical
refactor with a tight blast radius — every method either keeps its
single-key kwarg or grows an array kwarg, and the existing callers
don't change shape.

**Files**
- `lib/wiki_action_api.rb` — extend the methods listed below.
- New unit tests under `spec/lib/wiki_action_api_spec.rb` covering the
  array variants (with VCR cassettes against real responses).

**Methods to extend (and the API param they map to):**

| Current signature | New shape | Action API native limit |
|---|---|---|
| `get_page_info(pageid:/title:)` | also accepts `pageids:` / `titles:` (array) → returns hash keyed by canonical title | 50 (500 w/ apihighlimits) |
| `get_page_protections(pageid:/title:)` | also accepts arrays → hash | 50 |
| `get_page_revision_at_timestamp(pageid:, timestamp:)` | also `pageids:` → hash of pageid → revision | 50 |
| `get_first_revision(pageid:)` | also `pageids:` → hash | 50 |
| `get_lead_section_wikitext(pageid:, revision_id:)` | also `pageids:` (with `rvslots`/`rvprop=content`, `rvsection=0`) → hash | 50 |
| `get_page_assessments(pageid:/title:)` | also arrays → hash | 50 |
| `get_images_count(title:)` | also `titles:` → hash of title → count | 50 |
| `get_templates(title:, namespace:)` | also `titles:` → hash | 50 |
| `get_langlinks_count(title:)` | **delete** — replaced by callers using existing `get_langlinks(titles:)` | n/a |

**Conventions for the array variants:**
- Single-element kwarg keeps current return shape (a hash for the
  page) for backwards compatibility.
- Array kwarg returns a hash keyed by the lookup key (title or
  pageid) so callers can index without re-walking the response.
- Continue to use `fetch_all` / pagination loops where applicable;
  document in each method's comment that the *response* paginates
  per-batch but the batch itself shrinks the request count by 50×.
- All array methods chunk internally to 50 (constant `BATCH_SIZE = 50`
  on the class) so callers don't have to.
- Authentication / UA / 429 handling is unchanged — this is purely
  a shape change.

**Risks.**
- **Continuation behavior.** With multiple titles, MediaWiki may
  return continuation tokens that apply to one of the pages in the
  batch (e.g. `tlcontinue` for a page with >max templates). The
  existing `fetch_all` loop already handles `continue` correctly at
  the response level, but the per-page result merge (currently
  overwrites, see `get_langlinks` for the pattern at
  `wiki_action_api.rb:355-364`) needs to be repeated for each new
  method. Test with a synthetic case where one of 50 titles has
  >`max` of the queried prop.
- **Redirects.** Single-title `redirects: true` already collapses
  to canonical title; with multiple titles, the response includes a
  `redirects` array mapping inputs → canonical. The result hash key
  needs to be the *canonical* title or the *input* title
  consistently. Pick canonical (matches current single-title
  behavior) and preserve a redirects map for callers that need to
  look up by input.

**Validation.**
- Spec suite passes.
- A staging run of `GenerateArticleAnalyticsJob` on
  `crispr_gene_editing` (99 articles, the doc's regression baseline)
  produces analytics rows byte-equal to the pre-change run. Same
  `topic_article_analytics` JSON dump, modulo timestamps.

---

## Phase 2 — Batch fetches in `TimepointService`

**Why this is the largest single win.** This is the `T × A` loop.
With T=10 timestamps and A=1000 articles, the inner block currently
issues ~40,000 API calls. Batching pageids into 50s drops it toward
~800–1,500.

**Files**
- `app/services/timepoint_service.rb` — restructure
  `build_timepoints_for_timestamp` and the surrounding loop.
- `app/services/article_stats_service.rb` — add a batched variant of
  `update_stats_for_article_timepoint`; remove the
  `VisualizerToolsApi` call.
- `app/services/topic_article_timepoint_stats_service.rb` — accept
  pre-fetched `revisions_in_range` instead of fetching its own.
- `lib/visualizer_tools_api.rb` — keep file (still used by
  `update_stats_for_article_timepoint` callers outside this loop, if
  any; if none remain, mark deprecated).

**Restructure:**

The current shape is:

```ruby
timestamps.each do |timestamp|
  article_bag_articles.in_batches(of: 200) do |batch|
    Parallel.each(batch, in_threads: 10) do |aba|
      build_timepoints_for_article(article_bag_article: aba, topic_timepoint:)
    end
  end
end
```

The new shape:

```ruby
timestamps.each_with_index do |timestamp, idx|
  prev_timestamp = timestamps[idx - 1] if idx > 0
  article_bag_articles.in_batches(of: 50) do |batch|
    pageids = batch.map { |aba| aba.article.pageid }.compact

    revisions_at_ts        = api.get_page_revisions_at_timestamp(pageids:, timestamp:)
    revisions_in_range_map = api.get_all_revisions_in_range(pageids:, start_timestamp: prev_timestamp, end_timestamp: timestamp)

    # No more separate VisualizerTools call for revisions_count — derive it.

    # WP10 stays single-rev: use the same Parallel.each fan-out, but only
    # for the LiftWing call. The rest of the per-article work is in-memory
    # because the data is now pre-fetched.
    Parallel.each(batch, in_threads: 10) do |aba|
      revision  = revisions_at_ts[aba.article.pageid]
      revisions = revisions_in_range_map[aba.article.pageid] || []
      wp10      = lift_wing_score(revision)  # still 1 call/article
      write_timepoint_rows(aba, timestamp, revision, revisions, wp10)
    end
  end
end
```

**Eliminating `VisualizerToolsApi#get_page_edits_count`.** This is
the cumulative count from `first_revision_id` to current revision.
Two approaches:

1. **Derive from in-range data, processing chronologically.**
   Maintain `running_count[article_id]` across timestamps. Bootstrap
   once before the timestamp loop with one batched
   `get_all_revisions_in_range(pageids: all_pageids, start_timestamp:
   nil, end_timestamp: timestamps.first)` to get the count at first
   timestamp; thereafter, `count[T] = count[prev_T] +
   revisions_in_range_map[pageid].length`. **No external call needed.**

2. **(Fallback if 1 has issues.)** Add a batched variant to
   `VisualizerToolsApi#get_page_edits_count(pageids:, …)`. Less
   attractive because the tools service is on Toolforge and we'd need
   to coordinate.

Go with (1). It's correct because `revisions_in_range` already
returns the data we need, and chronological processing is already the
natural order.

**Watch out for:**
- **Force-update mode.** Today, `force_updates` re-fetches every
  timestamp's data even if the row exists. With batching, that's
  still cheap because the batch already happened. But the `update`
  writes need to be idempotent — verify.
- **Articles created mid-window.** The current loop uses
  `article.exists_at_timestamp?(timestamp)` to skip articles before
  they were created. Keep that check in the per-article inner block;
  batched fetches happily return empty results for those, so the
  `revisions_at_ts[pageid]` for them will be nil and the existing
  nil-guards take over.
- **Sha1-hidden revisions.** Currently filtered at
  `article_stats_service.rb:93` (`return if revision['sha1hidden']`).
  The batched fetch returns the same `slotsha1` field per page, so
  the same filter applies — just inline it in the writer.
- **Deleted/missing pages.** Fan-out will encounter pages that are
  now missing. The action API returns a `missing: true` flag in the
  page entry; map to nil in the result hash. Existing nil-guards
  handle the rest.
- **Continuation correctness.** Confirm in Phase 1 testing that
  batched `prop=revisions, rvlimit=1, rvstart=…, rvdir=older` doesn't
  trigger continuation across the 50-page batch (it shouldn't —
  `rvlimit=1` per page caps the response).

**Validation.**
- Spec parity: `spec/services/timepoint_service_spec.rb` (and any
  related fixtures) must pass.
- Real-data regression on `crispr_gene_editing`:
  `GenerateTimepointsJob` should produce the same `topic_timepoints`,
  `article_timepoints`, `topic_article_timepoints`, and
  `topic_summary` rows as the pre-change run. Compare with a SQL
  dump diff. Time the run — the §4 baseline in
  `docs/wikimedia-api-notes.md` was 8.7 min; expect well under 2 min
  if Phase 2 is doing its job.

---

## Phase 3 — Batch fetches in `GenerateArticleAnalyticsJob`

**Files**
- `app/sidekiq/generate_article_analytics_job.rb` — restructure the
  per-article loop into per-chunk batched fetches.
- `app/services/article_stats_service.rb` — add chunk-aware accessors
  that the job calls; the existing per-article accessors stay (other
  callers exist).

**Restructure.** Replace the `Parallel.each(articles, in_threads: 3)`
per-article fan-out with a chunk-then-fan-out pattern:

```ruby
articles.each_slice(50) do |chunk|
  pageids = chunk.map(&:pageid).compact
  titles  = chunk.map(&:title)

  # One batched action-API call per attribute family:
  page_infos        = api.get_page_info(pageids:)              # for missing flags
  first_revs        = api.get_first_revision(pageids:)         # publication_date
  lang_counts       = api.get_langlinks(titles:).transform_values { |arr| arr.size + 1 }
  images_counts     = api.get_images_count(titles:)
  templates_per     = api.get_templates(titles:)               # for warning_tags
  assessments       = api.get_page_assessments(titles:)
  protections       = api.get_page_protections(titles:)

  revs_at_end       = api.get_page_revision_at_timestamp(pageids:, timestamp: end_date)
  revs_at_prev_end  = api.get_page_revision_at_timestamp(pageids:, timestamp: prev_end_date)
  lead_at_end       = api.get_lead_section_wikitext(pageids:, revision_ids: revs_at_end.values.map(&:revid))

  talk_titles       = titles.map { |t| "Talk:#{t}" }
  talk_infos        = api.get_page_info(titles: talk_titles)
  talk_revs_at_end  = api.get_page_revision_at_timestamp(pageids: talk_infos_pageids, timestamp: end_date)
  talk_revs_at_prev = api.get_page_revision_at_timestamp(pageids: talk_infos_pageids, timestamp: prev_end_date)

  # Now per-article: only the truly-not-batchable calls remain.
  Parallel.each(chunk, in_threads: 3) do |article|
    avg_views      = pageviews_api.get_average_daily_views(article: article.title, ...)
    prev_avg_views = pageviews_api.get_average_daily_views(article: article.title, ...)
    backlinks      = api.get_backlinks_count(title: article.title)
    editors        = api.get_unique_editors_count(pageid: article.pageid)
    write_analytic_row(article, prefetched_chunk_data, avg_views, prev_avg_views, backlinks, editors)
  end
end
```

Approximate call shape, before vs. after, per 50 articles:
- **Before:** ~16 × 50 = **800 calls** (about half action-API, half
  external).
- **After:** ~10 batched action-API calls + (4 per-article × 50) =
  **~210 calls**. ~3.8× cut on calls.

**This phase alone won't 10×.** Combined with Phase 4's TTL cache
(where most chunks for already-seen articles skip the fetch
entirely), it does. Land Phase 3 first to fix the call shape; Phase
4 makes it compound.

**Watch out for:**
- **Missing/redirected articles.** The action API silently drops
  missing pages from the response (`page['missing']` is set). Result
  hashes need a `missing? -> nil` policy.
- **Talk pages don't exist for many articles.** `talk_infos` will be
  partial. Map to `talk_size: nil` for those.
- **Lead-section batch.** The `prop=revisions, rvsection=0,
  rvprop=content` query with multiple `rvstartid`s is awkward —
  MediaWiki only takes one `rvstartid` at a time. Fall back to
  either:
  - Issuing the lead-section call without `rvstartid` (gets the
    latest, which is what callers want for `end_date`-relative size
    most of the time);
  - Or doing the lead-section fetch as a per-article call inside the
    inner Parallel block. It's only one of the 16 per-article calls
    and we still saved on the other 9.

- **`recently_processed_ids` cache.** Already pre-loads the
  recent-analytics set in one query (line 45). Keep it; check at the
  top of the per-chunk block to skip already-fresh articles before
  issuing batched fetches. (Subset filtering is fine — the action
  API doesn't care if you ask about 47 of 50 pageids.)

**Validation.**
- Spec parity in
  `spec/sidekiq/generate_article_analytics_job_spec.rb`.
- Real-data regression on `crispr_gene_editing`: same 99 analytics
  rows. Per the doc's baseline that was 1,287 calls in 0 429s. After
  Phase 3, expect ~300–350 calls. Time should drop noticeably.

---

## Phase 4 — Promote article-scoped fields out of `TopicArticleAnalytic`

**Why this is the compounding win.** Phases 2 and 3 reduce the
per-call cost. Phase 4 reduces *how often we make the call at all*
by sharing fetched data across topics.

**Schema change.** Split `TopicArticleAnalytic` into:

- **`ArticleAnalytic`** (new, keyed by `article_id`):
  - `linguistic_versions_count`
  - `images_count`
  - `warning_tags_count`
  - `number_of_editors`
  - `assessment_grade`
  - `article_protections`
  - `incoming_links_count`
  - `publication_date`
  - `refreshed_at` (TTL marker)
- **`TopicArticleAnalytic`** (existing, retains topic-scoped fields):
  - `average_daily_views`, `prev_average_daily_views`
  - `article_size`, `prev_article_size`
  - `talk_size`, `prev_talk_size`
  - `lead_section_size`
  - `updated_at` (existing 6h freshness marker)

**Files**
- New migration: create `article_analytics`.
- Migration: drop the moved columns from `topic_article_analytics`.
  Backfill from the old table first.
- `app/models/article_analytic.rb` (new).
- `app/models/topic_article_analytic.rb` — drop attributes, add
  `has_one :article_analytic, through: :article` (or similar).
- `app/sidekiq/generate_article_analytics_job.rb` — split the write
  into two upserts. Skip `ArticleAnalytic` fetch for any article
  whose `article_analytic.refreshed_at > N.days.ago` (TTL constant;
  start with 7 days).
- Any UI/serializer that reads `TopicArticleAnalytic.<field>` —
  update to join `ArticleAnalytic`.

**TTL strategy.**
- **`ArticleAnalytic.refreshed_at`** — refresh when older than 7
  days. (Constant `ARTICLE_ANALYTIC_TTL = 7.days`; revisit after
  observing real usage.)
- **`TopicArticleAnalytic.updated_at`** — keep current
  `RECENCY_WINDOW = 6.hours` for the topic-scoped fields. Different
  cadence is fine because pageviews / size at end_date *do* drift
  faster than article-level traits.

**Backfill.** One migration that reads existing
`topic_article_analytics` rows, deduplicates on `article_id` (taking
the most recent value per article), and inserts into
`article_analytics` with `refreshed_at = updated_at`. Then the
column-drop migration. Worth keeping a 14-day rollback window where
the old columns are still present but unused — flip a feature flag
in the job to read from the new table, observe, then drop columns.

**Watch out for:**
- **Article-level fields aren't truly invariant.** Number of editors
  grows over time; image count can change after a page edit;
  assessment grade can change. The TTL captures this: 7 days is
  short enough that drift is bounded but long enough that most
  cross-topic re-imports get a hit.
- **Concurrent writes.** Two topics being analyzed at once might
  both attempt to refresh the same `ArticleAnalytic`. Use
  `upsert_all` with `unique_by: :article_id` — last-writer-wins is
  fine; the data is fungible.
- **UI surface.** Audit `TopicArticleAnalytic` references in the
  React side — any serializer that returns the moved fields needs to
  switch to the join.

**Validation.**
- Backfill produces row counts equal to `SELECT COUNT(DISTINCT
  article_id) FROM topic_article_analytics`.
- A second-topic-import test: import a topic that overlaps
  significantly with `crispr_gene_editing` (same articles in another
  topic). On the second run, observe in logs that ~all overlapping
  articles skipped the article-level fetches; the run should be
  substantially faster than a cold first run.
- UI: spot-check the topic detail page renders identical analytics
  for an existing topic before and after the migration.

---

## Sequencing & estimated impact

| Phase | Stage affected | Est. wall-clock cut | Risk | Order |
|---|---|---|---|---|
| 1: WikiActionApi array-aware | (foundation) | n/a | Low | First |
| 2: TimepointService batched | timepoint build | 10–25× | Medium | After 1 |
| 3: AnalyticsJob batched | analytics | 3–4× alone | Medium | After 1 |
| 4: ArticleAnalytic split | analytics on later runs | 3–10× *additional* (steady state) | Higher (schema) | After 3 |

Steady-state target: a topic build that today takes ~9 minutes (per
the regression baseline) lands under a minute, with most of the
residual time in pageviews + LiftWing + WikiWho.

## Cross-cutting

- **Don't change concurrency tuning yet.** `THREADS_COUNT = 3` in
  analytics and `10` in TimepointService were tuned against 429
  evidence. With fewer total calls per run, headroom opens up — but
  raise concurrency in a separate change with its own validation,
  after Phase 3 lands.
- **Keep the per-call retry handlers.** All the 429/Retry-After work
  documented in `docs/wikimedia-api-notes.md` stays in place;
  batching reduces the *number* of calls but doesn't change the
  per-call rate-limit story.
- **Update `docs/wikimedia-api-notes.md`** at the end of each phase
  with what we observed empirically, in the same format as §4
  ("Validated end-to-end"). The compounding documentation is part
  of why the rate-limit work was so trackable.
