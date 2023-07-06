class AddDetailsToArticle < ActiveRecord::Migration[7.0]
  def change
    add_column :articles, :first_revision_id, :integer
    add_column :articles, :first_revision_by_name, :string
    add_column :articles, :first_revision_by_id, :integer
    add_column :articles, :first_revision_at, :datetime
  end
end
