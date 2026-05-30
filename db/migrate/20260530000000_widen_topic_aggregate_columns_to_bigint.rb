# frozen_string_literal: true

class WidenTopicAggregateColumnsToBigint < ActiveRecord::Migration[7.0]
  # These columns sum a per-article quantity (content bytes, revision counts,
  # token counts) across every article in the topic. On a large topic the sum
  # overflows a 4-byte integer — a 160k-article topic produced a total length
  # of ~2.3B bytes, past the int4 ceiling of 2,147,483,647 — so widen them to
  # bigint. (The plain article/timepoint *count* columns stay integer; they're
  # bounded by the topic size and can't overflow.) Both tables aggregate the
  # same way, so both get the same treatment. The tables are small — a row per
  # (topic, timestamp) and per topic respectively — so this rewrites quickly.
  TABLES = %i[topic_timepoints topic_summaries].freeze
  COLUMNS = %i[
    length length_delta
    revisions_count revisions_count_delta attributed_revisions_count_delta
    attributed_length_delta
    token_count token_count_delta attributed_token_count
  ].freeze

  def up
    TABLES.each do |table|
      COLUMNS.each { |column| change_column table, column, :bigint }
    end
  end

  def down
    TABLES.each do |table|
      COLUMNS.each { |column| change_column table, column, :integer }
    end
  end
end
