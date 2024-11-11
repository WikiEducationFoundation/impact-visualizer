class AddTokenFieldsToTopic < ActiveRecord::Migration[7.0]
  def change
    add_column :topics, :convert_tokens_to_words, :boolean, default: false
    add_column :topics, :tokens_per_word, :float, default: 3.25
  end
end
