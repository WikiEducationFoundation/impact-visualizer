# frozen_string_literal: true

FactoryBot.define do
  factory :classification do
    name { 'Classification Name' }
    prerequisites do
      [{
        name: 'Gender',
        property_id: 'P21',
        value_ids: %w[Q6581072 Q1234567],
        required: false
      }]
    end
    properties do
      [{
        name: 'Gender',
        slug: 'gender',
        property_id: 'P21'
      }]
    end
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
