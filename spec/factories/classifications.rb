# frozen_string_literal: true

FactoryBot.define do
  factory :classification do
    factory :biography do
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
          property_id: 'P21',
          segments: [
            { label: 'Female', key: 'female', value_ids: %w[Q6581072], default: false },
            { label: 'Male', key: 'male', value_ids: %w[Q6581097], default: false },
            { label: 'Other', key: 'other', default: true }
          ]
        }]
      end
    end

    factory :biography_with_country do
      name { 'Biography' }
      properties do
        [
          {
            name: 'Gender',
            slug: 'gender',
            property_id: 'P21',
            segments: [
              { label: 'Female', key: 'female', value_ids: %w[Q6581072], default: false },
              { label: 'Male', key: 'male', value_ids: %w[Q6581097], default: false },
              { label: 'Other', key: 'other', default: true }
            ]
          },
          {
            name: 'Country of Citizenship',
            slug: 'country_of_citizenship',
            property_id: 'P27',
            segments: true
          }
        ]
      end
    end
  end
end

# == Schema Information
#
# Table name: classifications
#
#  id            :bigint           not null, primary key
#  derived_from  :string
#  description   :text
#  name          :string
#  ordering      :integer
#  prerequisites :jsonb
#  properties    :jsonb
#  source        :string           default("iv_classify"), not null
#  tb_handle     :string
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#
# Indexes
#
#  index_classifications_on_source  (source)
#
