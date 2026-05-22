# frozen_string_literal: true

class AddTopicBuilderFieldsToClassifications < ActiveRecord::Migration[7.0]
  def change
    add_column :classifications, :source, :string, default: 'iv_classify', null: false
    add_index  :classifications, :source

    add_column :classifications, :tb_handle, :string
    add_column :classifications, :description, :text
    add_column :classifications, :derived_from, :string
    add_column :classifications, :ordering, :integer
  end
end
