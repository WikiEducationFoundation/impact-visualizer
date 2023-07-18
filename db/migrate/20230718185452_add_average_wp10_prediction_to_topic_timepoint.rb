class AddAverageWp10PredictionToTopicTimepoint < ActiveRecord::Migration[7.0]
  def change
    add_column :topic_timepoints, :average_wp10_prediction, :float
  end
end
