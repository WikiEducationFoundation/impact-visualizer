# frozen_string_literal: true

class Classification < ApplicationRecord
  SOURCE_IV_CLASSIFY = 'iv_classify'
  SOURCE_TB_PAYLOAD = 'tb_payload'
  SOURCES = [SOURCE_IV_CLASSIFY, SOURCE_TB_PAYLOAD].freeze

  ## Associations
  has_many :topic_classifications, dependent: :destroy
  has_many :topics, through: :topic_classifications
  has_many :article_classifications, dependent: :destroy
  has_many :articles, through: :article_classifications

  ## Scopes
  scope :iv_classify, -> { where(source: SOURCE_IV_CLASSIFY) }
  scope :tb_payload, -> { where(source: SOURCE_TB_PAYLOAD) }

  ## Validations
  validates :source, inclusion: { in: SOURCES }
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

  ## For ActiveAdmin
  def self.ransackable_associations(_auth_object = nil)
    %w[article_classifications articles topic_classifications topics]
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[created_at derived_from description id name ordering prerequisites
       properties source tb_handle updated_at]
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
