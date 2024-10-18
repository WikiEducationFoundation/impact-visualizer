# frozen_string_literal: true
require 'rails_helper'

RSpec.describe Classification do
  describe 'associations' do
    it { is_expected.to have_many(:topic_classifications) }
    it { is_expected.to have_many(:article_classifications) }
    it { is_expected.to have_many(:topics).through(:topic_classifications) }
    it { is_expected.to have_many(:articles).through(:article_classifications) }
  end

  describe 'validations' do
    it 'validates prerequisites json' do
      classification = build(:biography, prerequisites: nil)
      expect(classification.valid?).to eq(false)
      expect(classification.errors.full_messages.first)
        .to include('Prerequisites does not comply to JSON Schema')

      classification.prerequisites = [{
        name: 'Gender'
      }]

      # Invalid, missing properties
      expect(classification.valid?).to eq(false)

      classification.prerequisites = [{
        name: 'Gender',
        property_id: 'P21',
        value_ids: %w[Q6581072 Q1234567],
        required: false
      }]

      # Valid, complete properties
      expect(classification.valid?).to eq(true)

      classification.prerequisites = [{
        name: 'Gender',
        property_id: 'P21',
        value_ids: %w[Q6581072 Q1234567],
        required: false,
        extra: '!!!'
      }]

      # Invalid, extra property
      expect(classification.valid?).to eq(false)
    end

    it 'validates properties json' do
      classification = build(:biography, properties: nil)
      expect(classification.valid?).to eq(false)
      expect(classification.errors.full_messages.first)
        .to include('Properties does not comply to JSON Schema')

      classification.properties = [{
        name: 'Gender'
      }]

      # Invalid, missing properties
      expect(classification.valid?).to eq(false)

      classification.properties = [{
        name: 'Gender',
        slug: 'gender',
        property_id: 'P21',
        segments: false
      }]

      # Valid, complete properties, no segments
      expect(classification.valid?).to eq(true)

      classification.properties = [{
        name: 'Gender',
        slug: 'gender',
        property_id: 'P21',
        segments: true
      }]

      # Valid, complete properties, with filter = true
      expect(classification.valid?).to eq(true)

      classification.properties = [{
        name: 'Gender',
        slug: 'gender',
        property_id: 'P21',
        segments: [
          {
            label: 'Male',
            key: 'male',
            value_ids: %w[Q6581097],
            default: false
          },
          {
            label: 'Female',
            key: 'female',
            value_ids: %w[Q6581072],
            default: false
          },
          {
            label: 'Other',
            key: 'other',
            default: true
          }
        ]
      }]

      classification.valid?

      # Valid, complete properties, with filter sets
      expect(classification.valid?).to eq(true)

      classification.properties = [{
        name: 'Gender',
        slug: 'gender',
        property_id: 'P21',
        segments: false,
        extra: '!!!'
      }]

      # Invalid, extra property
      expect(classification.valid?).to eq(false)
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
