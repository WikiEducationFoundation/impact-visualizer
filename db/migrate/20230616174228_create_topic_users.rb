class CreateTopicUsers < ActiveRecord::Migration[7.0]
  def change
    create_table :topic_users do |t|
      t.references :topic, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end
  end
end
