class RemoveSomeUnusedFields < ActiveRecord::Migration[7.0]
  def change
    remove_column :topic_article_timepoints, :attributed_token_count_delta, :integer
    remove_column :topic_article_timepoints, :initial_attributed_token_count, :integer
    remove_column :topic_timepoints, :attributed_token_count_delta, :integer
    remove_column :topic_timepoints, :wp10_prediction, :float
    remove_column :topic_timepoints, :closest_revision_id, :integer
    remove_column :topic_summaries, :attributed_token_count_delta, :integer
  end
end
