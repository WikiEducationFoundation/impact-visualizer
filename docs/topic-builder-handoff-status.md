# Topic Builder → Impact Visualizer handoff: completion status

Snapshot as of 2026-05-08 of items in the TB-side spec doc at
`wikipedia-topic-builder/docs/backlog/impact-visualizer.md`.

## Done (IV side, from the backlog table)

| Component | Shipped in |
| --- | --- |
| `GET /imports/<handle>` preview page | #55 |
| `POST /imports/<handle>` import handler | #55 |
| `ArticleBagArticle.centrality` column | #55 |
| `Topic.tb_handle` column | #55 |
| End-to-end dogfood run (6562-article climate-change topic, wmcloud + wiki-ed prod) | manual, 2026-05-08 |

That clears all four `☐ not started` rows on the IV side of the
backlog's implementation-status table, plus the "blocked on IV"
dogfood row.

## Done (related scaling work, not on the backlog table but in scope)

| Work | Where |
| --- | --- |
| Parallelize `GenerateArticleAnalyticsJob` (3 threads) | #56 |
| Wikimedia OAuth 2 bearer auth on Action + REST APIs | #56 |
| 429 retry jitter 0–0.5 s → 0–3 s | #56 |
| Sequential chain: analytics → incremental timepoint build | #56 |
| Talk-page `nil`-deref logger fix | #56 |
| `TopicTimepointStatsService` N+1: eager-load `article_timepoint` | branch `eager-load-article-timepoints` |
| `TopicTimepointStatsService` N+1: read `attributed_creator_id` instead of loading User | branch `eager-load-article-timepoints` |
| Drop redundant `update_details_for_article` in 8 `get_*` helpers | branch `eager-load-article-timepoints` |
| Memoize revision lookups by `(pageid, date)` | branch `eager-load-article-timepoints` |
| `get_unique_editors_count` uses `prop=contributors` | branch `eager-load-article-timepoints` |
| `TopicsController#topic_article_analytics` nil-bag guard (Sentry IMPACT-VISUALIZER-1K) | branch `topic-article-analytics-nil-bag-fix` |

## Still open (from the backlog's § Forward-compat)

- **Atomic edits** — `patch_iv_topic` MCP tool + IV-side `PATCH /api/v1/topics/<slug>/article_bag`. Linkage shape reserved via `topics.tb_handle`. Needs a TB→IV admin API token (server-to-server) and bearer auth on the IV endpoint.
- **TB → IV user list** — TB doesn't emit users yet; IV's TB-topic UI hides the Users panel rather than carrying a placeholder. Symmetric ingest is straightforward once TB starts emitting.
- **Schema version bump path** — IV hard-fails on `schema_version != 1`. Coordination story needed before TB ships v2 (likely paired with atomic edits).
- **Non-admin (authenticated editor) imports** — v1 is admin-only on POST. Broadening is straightforward; `TopicBuilderImportService` already accepts a `topic_editor`.

## TB-side doc maintenance

The implementation-status table in the backlog doc still shows the
four IV-side rows as `☐ not started` and the dogfood row as
`☐ blocked on IV`. Those should be flipped on the TB repo —
separate commit there.
