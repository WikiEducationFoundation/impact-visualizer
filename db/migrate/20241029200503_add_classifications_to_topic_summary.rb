class AddClassificationsToTopicSummary < ActiveRecord::Migration[7.0]
  def change
    add_column :topic_summaries, :classifications, :jsonb, default: []
  end
end
