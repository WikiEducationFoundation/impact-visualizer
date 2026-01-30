# frozen_string_literal: true

class TopicTimepoint < ApplicationRecord
  # Associations
  belongs_to :topic
  has_many :topic_article_timepoints, dependent: :destroy

  # Scopes
  default_scope { order(timestamp: :asc) }

  # Delegates
  delegate :wiki, to: :topic

  ## Validations
  validates :classifications, json_schema: true

  ## JSON Schemas
  CLASSIFICATIONS_SCHEMA = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        count: { type: 'number' },
        count_delta: { type: 'number' },
        revisions_count: { type: 'number' },
        revisions_count_delta: { type: 'number' },
        token_count: { type: 'number' },
        token_count_delta: { type: 'number' },
        wp10_prediction_categories: { type: 'object' },
        properties: {
          type: %w[array],
          items: { type: 'object' },
          properties: {
            name: { type: 'string' },
            property_id: { type: 'string' },
            slug: { type: 'string' },
            segments: { type: %w[boolean object] }
          },
          required: %w[name slug property_id values],
          additionalProperties: false
        }
      },
      required: %w[count count_delta revisions_count revisions_count_delta
                   token_count token_count_delta id name properties],
      additionalProperties: false
    }
  }.freeze

  # For ActiveAdmin
  def self.ransackable_attributes(_auth_object = nil)
    %w[articles_count articles_count_delta attributed_articles_created_delta
       attributed_length_delta attributed_revisions_count_delta attributed_token_count
       average_wp10_prediction created_at id length length_delta revisions_count
       revisions_count_delta timestamp token_count token_count_delta topic_id
       updated_at wp10_prediction_categories]
  end
end

# == Schema Information
#
# Table name: topic_timepoints
#
#  id                                :bigint           not null, primary key
#  articles_count                    :integer
#  articles_count_delta              :integer
#  attributed_articles_created_delta :integer
#  attributed_length_delta           :integer
#  attributed_revisions_count_delta  :integer
#  attributed_token_count            :integer
#  average_wp10_prediction           :float
#  classifications                   :jsonb
#  length                            :integer
#  length_delta                      :integer
#  revisions_count                   :integer
#  revisions_count_delta             :integer
#  timestamp                         :date
#  token_count                       :integer
#  token_count_delta                 :integer
#  wp10_prediction_categories        :jsonb
#  created_at                        :datetime         not null
#  updated_at                        :datetime         not null
#  topic_id                          :bigint           not null
#
# Indexes
#
#  index_topic_timepoints_on_topic_id  (topic_id)
#
# Foreign Keys
#
#  fk_rails_...  (topic_id => topics.id)
#
