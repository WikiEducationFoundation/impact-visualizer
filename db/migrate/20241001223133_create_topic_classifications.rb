class CreateTopicClassifications < ActiveRecord::Migration[7.0]
  def change
    create_table :topic_classifications do |t|
      t.references :classification, null: false, foreign_key: true
      t.references :topic, null: false, foreign_key: true
      t.timestamps
    end
  end
end
