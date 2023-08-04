# frozen_string_literal: true

FactoryBot.define do
  factory :article_bag do
    name { 'Name of Article Bag' }

    factory :small_article_bag do
      after(:create) do |article_bag|
        require "#{Rails.root}/spec/fixtures/test_articles"
        TestArticles::ARTICLE_IDS.each do |article_name|
          article = create(:article, title: article_name)
          create(:article_bag_article, article:, article_bag:)
        end
      end
    end
  end
end

# == Schema Information
#
# Table name: article_bags
#
#  id         :bigint           not null, primary key
#  name       :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  topic_id   :bigint           not null
#
# Indexes
#
#  index_article_bags_on_topic_id  (topic_id)
#
# Foreign Keys
#
#  fk_rails_...  (topic_id => topics.id)
#
