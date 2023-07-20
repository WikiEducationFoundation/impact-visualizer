class AddTokenCountToArticleTimepoint < ActiveRecord::Migration[7.0]
  def change
    add_column :article_timepoints, :token_count, :integer
  end
end
