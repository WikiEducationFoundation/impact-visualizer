# frozen_string_literal: true

class Classification < ApplicationRecord
  ## Associations
  has_many :topic_classifications
  has_many :topics, through: :topic_classifications
  has_many :article_classifications
  has_many :articles, through: :article_classifications

  ## Validations
  validates :prerequisites, json_schema: true
  validates :properties, json_schema: true

  ## JSON Schemas
  PREREQUISITES_SCHEMA = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        property_id: { type: 'string' },
        value_ids: { type: 'array', items: { type: 'string' } },
        required: { type: 'boolean' }
      },
      required: %w[name property_id value_ids required],
      additionalProperties: false
    }
  }.freeze

  PROPERTIES_SCHEMA = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        slug: { type: 'string' },
        property_id: { type: 'string' },
        segments: {
          type: %w[boolean array],
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              key: { type: 'string' },
              default: { type: 'boolean' },
              value_ids: { type: 'array', items: { type: 'string' } }
            },
            required: %w[label key default]
          }
        }
      },
      required: %w[name slug property_id segments],
      additionalProperties: false
    }
  }.freeze
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
