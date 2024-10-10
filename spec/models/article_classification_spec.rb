# frozen_string_literal: true
require 'rails_helper'

RSpec.describe ArticleClassification do
  describe 'associations' do
    it { is_expected.to belong_to(:article) }
    it { is_expected.to belong_to(:classification) }
  end

  describe 'validations' do
    it 'validates properties json' do
      article_classification = build(:article_classification, properties: nil)
      expect(article_classification.valid?).to eq(false)
      expect(article_classification.errors.full_messages.first)
        .to include('Properties does not comply to JSON Schema')

      article_classification.properties = [{
        name: 'Gender'
      }]

      # Invalid, missing properties
      expect(article_classification.valid?).to eq(false)

      article_classification.properties = [{
        name: 'Gender',
        slug: 'gender',
        property_id: 'P21',
        value_ids: %w[Q6581072 Q1234567]
      }]

      # Valid, complete properties
      expect(article_classification.valid?).to eq(true)

      article_classification.properties = [{
        name: 'Gender',
        slug: 'gender',
        property_id: 'P21',
        value_ids: %w[Q6581072 Q1234567],
        extra: '!!!'
      }]

      # Invalid, extra property
      expect(article_classification.valid?).to eq(false)
    end
  end
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
