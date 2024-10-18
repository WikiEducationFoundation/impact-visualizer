class AddClassificationsToTopicTimepoint < ActiveRecord::Migration[7.0]
  def change
    add_column :topic_timepoints, :classifications, :jsonb, default: []
  end
end
