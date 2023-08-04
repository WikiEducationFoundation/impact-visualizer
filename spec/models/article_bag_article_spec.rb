# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ArticleBagArticle do
  it { is_expected.to belong_to(:article_bag) }
  it { is_expected.to belong_to(:article) }
end

# == Schema Information
#
# Table name: article_bag_articles
#
#  id             :bigint           not null, primary key
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#  article_bag_id :bigint           not null
#  article_id     :bigint           not null
#
# Indexes
#
#  index_article_bag_articles_on_article_bag_id  (article_bag_id)
#  index_article_bag_articles_on_article_id      (article_id)
#
# Foreign Keys
#
#  fk_rails_...  (article_bag_id => article_bags.id)
#  fk_rails_...  (article_id => articles.id)
#
