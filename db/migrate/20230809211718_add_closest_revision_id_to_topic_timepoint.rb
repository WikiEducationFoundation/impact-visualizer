class AddClosestRevisionIdToTopicTimepoint < ActiveRecord::Migration[7.0]
  def change
    add_column :topic_timepoints, :closest_revision_id, :integer
  end
end
