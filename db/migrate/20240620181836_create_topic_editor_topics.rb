class CreateTopicEditorTopics < ActiveRecord::Migration[7.0]
  def change
    create_table :topic_editor_topics do |t|
      t.references :topic, null: false, foreign_key: true
      t.references :topic_editor, null: false, foreign_key: true

      t.timestamps
    end
  end
end
