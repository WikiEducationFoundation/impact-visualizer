# frozen_string_literal: true

class AddTbHandleToTopics < ActiveRecord::Migration[7.0]
  def change
    return if column_exists?(:topics, :tb_handle)

    add_column :topics, :tb_handle, :string
  end
end
