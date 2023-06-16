require 'rails_helper'

RSpec.describe ArticleBagArticle, type: :model do
  it { should belong_to(:article_bag) }
  it { should belong_to(:article) }
end

# == Schema Information
#
# Table name: article_bag_articles
#
#  id             :integer          not null, primary key
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#  article_bag_id :integer          not null
#  article_id     :integer          not null
#
# Indexes
#
#  index_article_bag_articles_on_article_bag_id  (article_bag_id)
#  index_article_bag_articles_on_article_id      (article_id)
#
# Foreign Keys
#
#  article_bag_id  (article_bag_id => article_bags.id)
#  article_id      (article_id => articles.id)
#
