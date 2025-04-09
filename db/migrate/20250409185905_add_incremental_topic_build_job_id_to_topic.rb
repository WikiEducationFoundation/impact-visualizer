class AddIncrementalTopicBuildJobIdToTopic < ActiveRecord::Migration[7.0]
  def change
    add_column :topics, :incremental_topic_build_job_id, :string
  end
end
