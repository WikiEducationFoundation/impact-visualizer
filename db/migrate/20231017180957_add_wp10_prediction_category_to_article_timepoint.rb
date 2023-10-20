class AddWp10PredictionCategoryToArticleTimepoint < ActiveRecord::Migration[7.0]
  def change
    add_column :article_timepoints, :wp10_prediction_category, :string
  end
end
