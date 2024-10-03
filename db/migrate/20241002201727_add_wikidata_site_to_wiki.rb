class AddWikidataSiteToWiki < ActiveRecord::Migration[7.0]
  def change
    add_column :wikis, :wikidata_site, :string
  end
end
