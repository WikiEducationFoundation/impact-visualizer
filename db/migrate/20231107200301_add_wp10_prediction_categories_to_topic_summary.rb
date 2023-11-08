class AddWp10PredictionCategoriesToTopicSummary < ActiveRecord::Migration[7.0]
  def change
    add_column :topic_summaries, :wp10_prediction_categories, :jsonb
  end
end
