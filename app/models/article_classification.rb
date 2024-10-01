# frozen_string_literal: true

class ArticleClassification < ApplicationRecord
  ## Associations
  belongs_to :classification
  belongs_to :article

  ## Validations
  validates :properties, json_schema: true

  ## JSON Schemas
  PROPERTIES_SCHEMA = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        slug: { type: 'string' },
        property_id: { type: 'string' },
        value_ids: { type: 'array', items: { type: 'string' } }
      },
      required: %w[name slug property_id value_ids],
      additionalProperties: false
    }
  }.freeze
end

# == Schema Information
#
# Table name: article_classifications
#
#  id                :bigint           not null, primary key
#  properties        :jsonb
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  article_id        :bigint           not null
#  classification_id :bigint           not null
#
# Indexes
#
#  index_article_classifications_on_article_id         (article_id)
#  index_article_classifications_on_classification_id  (classification_id)
#
# Foreign Keys
#
#  fk_rails_...  (article_id => articles.id)
#  fk_rails_...  (classification_id => classifications.id)
#
