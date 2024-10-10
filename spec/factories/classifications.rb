# frozen_string_literal: true

FactoryBot.define do
  factory :classification do
    name { 'Biography' }
    prerequisites do
      [{
        name: 'Instance of human',
        property_id: 'P31',
        value_ids: ['Q5'],
        required: true
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
