class AddWp10PredictionCategoriesToTopicTimepoint < ActiveRecord::Migration[7.0]
  def change
    add_column :topic_timepoints, :wp10_prediction_categories, :jsonb
  end
end
