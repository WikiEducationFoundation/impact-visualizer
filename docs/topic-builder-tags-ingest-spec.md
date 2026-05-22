# Impact Visualizer — ingest tags from Topic Builder

**Status:** ☐ not started — IV-side work. TB side shipped 2026-05-22
(see `article-tags.md` § shipped and `docs/shipped.md` § Article tags v1).
This doc is the IV-side spec the work will follow.

Sibling doc: `impact-visualizer.md` (the publish_topic / package
handoff that this builds on top of).

## Goal

Get tags + per-article tag membership from the TB v2 package payload
into Impact Visualizer's database in a shape the existing chart code
can render, so the per-article Wikidata fan-out
(`classify_all_articles`) can go away on new topics.

The TB side already emits the full IV-shaped payload — same wire
shape as `Classification.properties` / `ArticleClassification.properties`
that IV's chart code consumes today. IV's job is to read it on import
and persist it; no Wikidata calls required.

## Scope

**In scope:**
1. Read `tags` taxonomy + per-article `tags` fields from the v2
   package on import.
2. Persist into IV's database so charts can read them.
3. Stop running `classify_all_articles` on TB-imported topics.
4. Hard-fail import on `schema_version > 2` (handle 1 and 2; reject
   future versions with a clear "update IV" message).

**Out of scope:**
- ActiveAdmin classification editor changes (no edits to TB-sourced
  tags from the IV UI — they're snapshot-frozen).
- Migrating existing classification-based topics. Per the article-
  tags.md locked-decision (b): old classifications keep working until
  the topic gets re-imported from TB.
- Chart UI changes. The segment/property shape is preserved word-
  for-word from `Classification.properties`; the chart code keeps
  rendering as today, just reading from a different source.

## TB side — what's already shipped

TB writes packages assuming this contract (see TB commit `0873829`
and `docs/shipped.md` § Article tags v1):

### Schema version

- `schema_version: 1` (legacy) — package omits `tags` field; per-
  article entries have no `tags` field.
- `schema_version: 2` (tags emission) — package carries a top-level
  `tags` taxonomy; per-article entries carry a `tags` array.

Feature flag: TB only emits v2 when `TB_EMIT_TAGS=1` is set in the
service env. Coordination order is: IV ships the v2 reader → TB
flips the flag → IV begins deprecating `Classification` authoring.

### Wire shape (v2)

```json
{
  "handle": "tbp_...",
  "schema_version": 2,
  "config": {
    "name": "Climate change",
    "slug": "climate-change",
    "description": "...",
    "editor_label": "editors",
    "start_date": "2001-01-15",
    "end_date": "2026-05-22",
    "timepoint_day_interval": 90,
    "wiki": "en",
    "wiki_id": 1
  },
  "articles": [
    {
      "title": "Greta Thunberg",
      "centrality": 8,
      "tags": [
        {
          "name": "biography",
          "values": [
            {"slug": "gender", "value_ids": ["Q6581072"]},
            {"slug": "country", "value_ids": ["Q34"]}
          ]
        },
        {"name": "movement", "values": []}
      ]
    },
    {"title": "Carbon capture", "centrality": 7, "tags": [
      {"name": "mitigation", "values": []}
    ]}
  ],
  "article_count": 6162,
  "source_topic": "climate-change",
  "source_topic_id": 12,
  "created_at": "2026-05-22 17:00:00",
  "consumed_at": "2026-05-22 17:00:32",
  "tags": [
    {
      "name": "biography",
      "description": "People notable for climate work.",
      "ordering": 3,
      "derived_from": "wikidata:P31=Q5",
      "properties": [
        {
          "slug": "gender",
          "name": "Gender",
          "wikidata_property_id": "P21",
          "segments": [
            {"key": "female", "label": "Female",
             "value_ids": ["Q6581072"]},
            {"key": "male", "label": "Male",
             "value_ids": ["Q6581097"]},
            {"key": "other", "label": "Other", "default": true}
          ]
        },
        {
          "slug": "country",
          "name": "Country",
          "wikidata_property_id": "P27",
          "segments": true
        }
      ]
    },
    {
      "name": "mitigation",
      "description": "Reducing emissions or sequestering carbon.",
      "ordering": 0,
      "derived_from": null,
      "properties": []
    },
    ...
  ]
}
```

**Key invariants TB guarantees:**

- `tags[].name` is a kebab-case slug; unique within the package.
- `tags[].properties[].segments` is either the literal `true` (auto-
  group by top values) or an array of explicit bins matching today's
  IV `Classification.properties[].segments` shape.
- `articles[].tags[].name` always references a `tags[].name` in the
  same package — no dangling references.
- `articles[].tags[].values[].slug` always references a property
  `slug` declared on that tag — no dangling references.
- `value_ids` are Wikidata QIDs (`Q\d+`) when the property has a
  `wikidata_property_id`; for AI-judgment properties without one,
  they may be any short string IV's segment matcher accepts.
- A tag with `properties: []` is a "binary" tag — articles either
  have it or don't, no per-property values.
- Tag absence on an article is informational, not negative. (See §
  Additive semantics.)

## IV side — what to build

### Data model

Two paths. Recommend **path A (reuse existing tables)** for minimum
chart-code disturbance; flag the trade-off explicitly.

**Path A — reuse `Classification` + `ArticleClassification`.**

- Add `Classification.source` (string, indexed, default `"iv_classify"`).
  TB-imported rows get `source: "tb_payload"`. Existing rows
  unaffected (default applied retroactively).
- TB-imported rows leave `prerequisites` as `[]` (or NULL — IV's
  classify pass already treats empty prerequisites as "no membership
  rule defined" and skips). The `properties` field carries the TB
  payload's `properties` array unchanged, slug-for-slug.
- Add `Classification.tb_handle` (nullable string) recording which
  TB handle minted this classification. Useful for audit + for
  recognizing republishes (drop+rebuild rows whose `tb_handle`
  matches the new import's handle).
- `ArticleClassification` rows persist exactly as today —
  `properties` JSONB carries the per-article values from the TB
  payload, same shape today's chart code consumes.

**Path A pros:** Chart code unchanged. ActiveAdmin admin views work
read-only for `source: "tb_payload"` rows (lock the editor on them).
Existing classified topics keep working untouched.

**Path A cons:** Slight semantic mixing — the `Classification` model
now means two things ("Wikidata-derived rule" + "TB-imported
snapshot"). Mitigated by the `source` discriminator.

**Path B — new `TopicBuilderTag` + `ArticleTopicBuilderTag` tables.**
Cleaner separation; same shape as Classification/ArticleClassification
but in their own tables. Requires duplicating chart-rendering logic
(or polymorphic glue) to read from both sources.

Recommend A. Default to A in the implementation unless review
surfaces a constraint that breaks it.

### Import flow

The existing `POST /imports/<handle>` handler (`impact-visualizer.md`
§ IV side — what shipped) is the natural extension point. Within
the existing DB transaction, after creating the Topic +
ArticleBag + ArticleBagArticles:

```ruby
if package["schema_version"] == 2 && package["tags"].present?
  # Phase 1: persist the taxonomy.
  tb_handle = params[:handle]
  tag_records = {}  # name -> Classification record
  package["tags"].each do |tag|
    rec = topic.classifications.create!(
      name:           tag["name"],
      description:    tag["description"],   # new column or use a JSON sidecar
      prerequisites:  [],                   # TB-sourced; no IV-side rule
      properties:     tag["properties"],    # passed through unchanged
      source:         "tb_payload",
      tb_handle:      tb_handle,
      ordering:       tag["ordering"],
      derived_from:   tag["derived_from"],  # audit-only; informational
    )
    tag_records[tag["name"]] = rec
  end

  # Phase 2: persist per-article membership.
  package["articles"].each do |article_entry|
    next if article_entry["tags"].blank?
    article = article_lookup[article_entry["title"]]
    article_entry["tags"].each do |article_tag|
      classification = tag_records[article_tag["name"]]
      ArticleClassification.create!(
        article:        article,
        classification: classification,
        properties:     article_tag["values"],  # [{slug, value_ids}]
      )
    end
  end
end
```

(Pseudocode — adapt to IV's actual relation names + service patterns.
`article_lookup` is the title → Article map you built during article
ingestion.)

### Republish handling

When the same `source_topic_id` re-imports (TB user clicks Import on
a fresh handle), IV should:

1. Find the existing IV `Topic` whose `tb_topic_id` matches
   `source_topic_id`.
2. Drop the topic's existing `Classification` rows where
   `source: "tb_payload"`. Cascade to `ArticleClassification`.
3. Re-create from the new payload via the phase 1 + 2 above.

Existing classifications with `source: "iv_classify"` are left
alone — they continue to render until the operator deletes them.

This is the same drop-and-rebuild pattern as articles; tags are
snapshot-frozen at publish time.

### Skipping classify_all_articles

`classify_all_articles` (the existing rake task / job that fetches
Wikidata claims per article) should not run for `tb_payload`-sourced
classifications:

```ruby
classification.classify_all_articles!  # current entry point
# becomes:
return if source == "tb_payload"
# ... existing Wikidata fan-out for iv_classify only
```

A topic with only `tb_payload` classifications + no `iv_classify`
classifications never hits the fan-out at all.

### Chart rendering compatibility

The chart code consumes `Classification.properties` +
`ArticleClassification.properties` to draw:
- *Classification vs. Other* (binary stratification)
- *Classification by Property* (segmented breakdown)
- WP10 prediction stratified by classification

The TB v2 payload's property + segment shape is identical to today's
`Classification.properties`, so the chart code reads through
unchanged. The only difference is the *source* of the data —
TB-supplied vs. locally computed via `classify_all_articles`.

If the chart code currently filters classifications by some flag
(e.g., "has prerequisites"), update that filter to render all
classifications regardless of source.

### Schema version handling

Update the existing schema-version check (`impact-visualizer.md`
line 290):

```ruby
unless [1, 2].include?(package["schema_version"])
  return render_error(
    "This handoff was minted for an unknown schema version " \
    "(#{package['schema_version']}). Update Impact Visualizer or " \
    "ask Topic Builder to mint a fresh handle.")
end
```

v1 packages continue to import as today (no tags). v2 packages
import tags. v3+ rejected.

### Additive semantics

Document explicitly that TB tags are *additive only*:

- Tag absence does NOT mean "the article is definitely not in this
  subset." It means "TB did not tag it." Reasons for absence include:
  Wikidata coverage gap, AI didn't tag, judgment call.
- Missing property values likewise mean "Wikidata or the AI didn't
  say," not "no value."
- Charts that compute "X vs. not-X" should label the "not-X" side as
  "Untagged / Other" rather than asserting negative membership.

This matches TB's design constraint (`feedback_wikidata_incomplete`
in TB's memory; § Additive only in TB's `server_instructions.md`).
It's a behavioral invariant the IV side must preserve when
visualizing.

## Deprecating the Classification editor

Once tag-import is shipped and dogfooded, the ActiveAdmin
Classification editor + `classify_all_articles` task become
maintenance-only:

1. Mark `tb_payload`-sourced rows read-only in the editor (no edit
   button; explanatory tooltip "managed by Topic Builder; edit there
   and re-publish to push changes").
2. Leave `iv_classify`-sourced rows editable through the deprecation
   period for legacy topics.
3. After all live IV topics have re-imported from TB:
   - Remove the ActiveAdmin "New Classification" button.
   - Remove `classify_all_articles` task + Wikidata-fan-out code.
   - Drop the `prerequisites` column (or keep as informational).

The deprecation is its own follow-up — out of scope for this spec's
v1 ship.

## Locked decisions

These should not be re-debated during implementation:

1. **Reuse Classification tables (path A).** Single source of truth
   for chart rendering; clean discriminator via `source` column.
2. **Snapshot-frozen.** Tags are part of the package; not re-fetched
   from TB after import. Edits flow via republish.
3. **Drop-and-rebuild on republish.** No per-tag diffing; replace
   the whole `tb_payload`-sourced set.
4. **No retroactive migration for existing classified topics.**
   They keep using `iv_classify` until reimported. Graceful coexist.
5. **Additive-only framing in charts.** Tag absence is never plotted
   as negative membership.
6. **Schema-version gating: 1 and 2 both accepted; 3+ rejected.**
   TB+IV coordinate on every future bump (same protocol as v1).

## Open questions

1. **`Classification.description` column.** TB tags carry a one-line
   `description`; today's Classification model may not have a field
   for it. Add a column, store in a JSON sidecar, or display from
   the property `name` field only? Lean: add a column; the data
   already flows.
2. **`Classification.derived_from` column.** Same shape question for
   the audit-trail field. Lean: add a column; it's small and useful
   in tooltips ("this tag came from Wikidata P31=Q5").
3. **`source` column index.** Needed if topic-scoped filters key on
   source. Lean: yes, index it; cost is trivial.
4. **Edge case: TB tag with `segments: true` (auto-group).** IV's
   existing chart code may already handle this; confirm before
   shipping. If not, the implementation requires a post-import pass
   to compute top-N segments across the topic's classified articles
   (matches today's behavior in `classify_all_articles` for
   auto-grouped properties).
5. **`description` versioning across republishes.** When a tag's
   description changes on re-import, do we want any kind of "this
   tag's meaning changed" surface? Lean: no; this is normal
   re-publish semantics. Snapshot-frozen means latest wins.

## IV-side implementation notes

Surfaced during pre-implementation review against the current IV
codebase. None of these change the locked decisions; they're
concrete adjustments to the pseudocode + open questions.

### Naming: `tb_source_topic_id`, not `tb_topic_id`

The existing column on `Topic` is `tb_source_topic_id` (see
`ImportsController#lookup_existing_topic`). Use that name in
implementation; spec's `tb_topic_id` is shorthand.

### `topic.classifications.create!` works as written

`Topic` has `has_many :classifications, through: :topic_classifications`
(`app/models/topic.rb:20-21`), so the spec's pseudocode in §Import
flow Phase 1 implicitly creates the `TopicClassification` join row
too. No extra wiring needed.

Republish cleanup: `topic.classifications.where(source: "tb_payload").destroy_all`
cascades through `topic_classifications` and `article_classifications`
cleanly (both join models use `dependent: :destroy` semantics; verify
`ArticleClassification` cascade and add `dependent: :destroy` to
`Classification.has_many :article_classifications` if missing).

### JSON-schema field-name drift (this is the real gotcha)

`Classification::PROPERTIES_SCHEMA` (`app/models/classification.rb`)
requires `property_id` per property entry. The TB v2 payload uses
`wikidata_property_id` (see wire shape line 121 in this doc). Two
options:

- **(preferred) Enrich at import time.** Rename
  `wikidata_property_id → property_id` when persisting, so the
  `properties` JSONB matches today's schema byte-for-byte. Chart code
  is untouched. The TB payload's `wikidata_property_id` is the same
  semantic — a `P\d+` Wikidata property id.
- **(alt) Widen the schema.** Add `wikidata_property_id` as an
  accepted alias. Cheaper migration but bifurcates the on-disk shape
  and complicates chart code that reads it. Skip unless enrichment
  turns out to have a hidden cost.

Same drift for `ArticleClassification::PROPERTIES_SCHEMA`: it
requires `name + slug + property_id + value_ids` per entry, but the
TB per-article `tags[].values` shape is just `{slug, value_ids}`. Fix
by enriching at import: look up the parent classification's property
by `slug` and copy `name` + `property_id` into the persisted entry.
This keeps the chart code reading the exact shape it does today.

### `segments: true` (spec open Q #4) — already handled

Verified against `ClassificationService#segment_by_value`
(`app/services/classification_service.rb:316-368`). When a property has
`segments == true`, the service computes top-N value_ids at render
time and labels the rest as `"other"`. No materialize-at-import pass
needed; TB payload's `segments: true` flows straight through.

### New columns on `classifications`

Migration adds (all nullable / defaulted):

- `source` (string, default `"iv_classify"`, indexed) — discriminator
- `tb_handle` (string, nullable) — audit + republish detection
- `description` (string, nullable) — open Q #1, lean: yes, just add
- `derived_from` (string, nullable) — open Q #2, lean: yes, just add
- `ordering` (integer, nullable) — for TB-defined display order

Backfill: existing rows get `source: "iv_classify"`; other new
columns stay NULL.

### `classify_all_articles` source-aware skip

Entry point lives on `ClassificationService`
(`app/services/classification_service.rb:14`), called from
`TimepointService` during timepoint generation
(`timepoint_service.rb:36, 71`). The per-classification iteration is at
`classification_service.rb:27` (`@topic.classifications.each`).

Add a scope on `Classification` — e.g. `scope :iv_classify, -> { where(source: "iv_classify") }` — and change line 27 to
`@topic.classifications.iv_classify.each`. That makes
`classify_all_articles` a no-op for any topic whose classifications
are all tb_payload-sourced (skips the per-article Wikidata fetch
loop entirely when there are zero matching classifications).

## Verification recipes

### TB side (already validated, captured here for reference)

```bash
# In a TB session: build a small topic, define a tag taxonomy, apply
# membership, publish_topic. Then curl the package:
curl https://topic-builder.wikiedu.org/packages/<handle> | jq '.tags, .articles[0]'
# Expect: top-level `tags` array; first article carries a `tags` field.
```

### Migration on IV side

```bash
# Run the migrations:
rails db:migrate
# Confirm Classification has source, tb_handle, description,
# derived_from columns.
psql -c "\d classifications"
```

### End-to-end with a real handle

1. From a TB session, define a `biography` tag with `gender`
   property (P21) on a small (~10-article) topic.
2. `tag_by_wikidata(tag="biography", predicates=[{"property_id":
   "P31", "value_ids": ["Q5"]}], capture_properties=["gender"])` —
   confirm response shows `tagged_new` > 0 and
   `properties_captured: ["gender"]`.
3. `publish_topic(...)` — capture handle.
4. Open `/imports/<handle>` on IV. Confirm preview renders v2.
5. Click Import. Confirm DB rows:
   ```
   psql -c "SELECT id, name, source, tb_handle FROM classifications
            WHERE topic_id = <new>"
   psql -c "SELECT COUNT(*) FROM article_classifications
            WHERE classification_id IN (<new>)"
   ```
6. Open the topic's chart page. Confirm "Classification vs. Other"
   and "Classification by Property" both render — same chart code,
   reading the TB-imported data.
7. Republish from TB after adding one new biography. Re-import on
   IV. Confirm the new article is now `ArticleClassification`'d
   correctly and the old rows were swapped out.

### Negative paths

- Import a v1 (tags-disabled) package on IV after this lands —
  confirm it imports cleanly with no Classification rows created.
- Import a v3 (synthetic) package — confirm hard-fail with the
  schema-version error.

## Coordination — flipping the TB flag

Once the IV side ships:

1. **Confirm IV is reading v2.** Manually test the round-trip from
   step "End-to-end with a real handle" above. The TB side stays in
   flag-off mode during this — set `TB_EMIT_TAGS=1` only on the
   operator's local TB if needed for end-to-end debugging.
2. **Flip the prod flag.** Operator adds `TB_EMIT_TAGS=1` to
   `/etc/topic-builder.env` and restarts the topic-builder service.
   AI does not edit this file (`CLAUDE.md` § /etc/topic-builder.env).
   Verify the running process picked up the change via the runtime
   `_tags_emission_enabled()` probe (see
   `/tmp/check_tags_slice5_deployed.py` for the recipe).
3. **First end-to-end dogfood.** Republish climate-change (or any
   live topic that's been tagged) on TB, click Import on IV, confirm
   the tags show in the chart.
4. **Begin deprecating** `Classification` authoring per § Deprecating
   the Classification editor above.

## Rough effort estimate

- IV migrations + model changes: 0.5d
- Import handler tag-ingest branch: 0.5d
- Republish drop-and-rebuild: 0.25d
- `classify_all_articles` source-aware skip: 0.25d
- ActiveAdmin read-only for `tb_payload` rows: 0.25d
- End-to-end QA + dogfood: 0.5d

Total: ~2 IV-engineer days.

## Cross-references

- `article-tags.md` — TB-side design decisions + open questions
  (rolled forward at ship time).
- `impact-visualizer.md` — the publish_topic / package handoff this
  builds on top of.
- TB commit `0873829` (slice 5: IV handoff payload, flag-gated).
- `mcp_server/iv_packages.py` — the route serving the package; v2
  payload assembly happens in `mcp_server/server.py:_build_iv_config_and_articles`.
