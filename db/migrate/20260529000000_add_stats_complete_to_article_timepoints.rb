# frozen_string_literal: true

class AddStatsCompleteToArticleTimepoints < ActiveRecord::Migration[7.0]
  def change
    # Marks an ArticleTimepoint whose stats pass has finished — including the
    # cases where there's no usable revision (page deleted at the timestamp,
    # or text suppressed), which leave revision_id nil. Lets an interrupted
    # build resume without re-fetching already-processed timepoints.
    add_column :article_timepoints, :stats_complete, :boolean, default: false, null: false
  end
end
