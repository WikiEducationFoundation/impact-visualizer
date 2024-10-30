# frozen_string_literal: true

ActiveAdmin.register Classification do
  filter :topics

  index do
    column :id
    column :name
    column :created_at
    column :updated_at
    actions
  end
end

# == Schema Information
#
# Table name: classifications
#
#  id            :bigint           not null, primary key
#  name          :string
#  prerequisites :jsonb
#  properties    :jsonb
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#
