# frozen_string_literal: true

ActiveAdmin.register Classification do
  filter :topics
  json_editor

  permit_params :name, :prerequisites, :properties

  index do
    column :id
    column :name
    column :created_at
    column :updated_at
    actions
  end

  form do |f|
    f.semantic_errors

    inputs do
      input :name
      input :prerequisites, as: :jsonb
      input :properties, as: :jsonb
    end

    f.actions
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
