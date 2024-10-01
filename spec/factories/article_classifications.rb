FactoryBot.define do
  factory :article_classification do
    classification { Classification.first || create(:classification) }
    article { Article.first || create(:article) }
    properties do
      [{
        name: 'Gender',
        slug: 'gender',
        property_id: 'P21',
        value_ids: %w[Q6581072 Q1234567]
      }]
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
