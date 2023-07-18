class AddWp10PredictionToArticleTimepoint < ActiveRecord::Migration[7.0]
  def change
    add_column :article_timepoints, :wp10_prediction, :float
  end
end
