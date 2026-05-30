# frozen_string_literal: true

class AddUniqueIndexToTopicTimepoints < ActiveRecord::Migration[7.0]
  # There should only ever be one TopicTimepoint per (topic, timestamp), but
  # nothing enforced it — and stage 3 (update_token_stats) calls
  # find_or_create_by!(topic:, timestamp:) from parallel threads, a
  # check-then-insert race that can produce duplicates. Duplicates let the
  # serving layer pick an arbitrary (possibly un-aggregated) row. Add a unique
  # index to enforce the invariant.
  #
  # Before the index can be added, collapse any existing duplicates: keep the
  # most-complete row per (topic, timestamp) — the one with the most
  # topic_article_timepoints, tie-broken by newest id — and delete the rest
  # along with their now-orphaned topic_article_timepoints (the FK has no
  # ON DELETE CASCADE). A subsequent build recomputes the kept row's stats from
  # its (more complete) timepoints. This is a no-op when there are no dupes.
  INDEX_NAME = 'index_topic_timepoints_on_topic_id_and_timestamp'

  DUPLICATE_IDS = <<~SQL.squish
    SELECT id FROM (
      SELECT tt.id,
             row_number() OVER (
               PARTITION BY tt.topic_id, tt.timestamp
               ORDER BY (
                 SELECT count(*) FROM topic_article_timepoints tat
                 WHERE tat.topic_timepoint_id = tt.id
               ) DESC, tt.id DESC
             ) AS rn
      FROM topic_timepoints tt
    ) ranked
    WHERE ranked.rn > 1
  SQL

  def up
    execute("DELETE FROM topic_article_timepoints WHERE topic_timepoint_id IN (#{DUPLICATE_IDS})")
    execute("DELETE FROM topic_timepoints WHERE id IN (#{DUPLICATE_IDS})")

    add_index :topic_timepoints, %i[topic_id timestamp], unique: true, name: INDEX_NAME
  end

  def down
    remove_index :topic_timepoints, name: INDEX_NAME
  end
end
