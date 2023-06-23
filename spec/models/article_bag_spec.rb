# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ArticleBag do
  it { is_expected.to belong_to(:topic) }
  it { is_expected.to have_many(:article_bag_articles) }
  it { is_expected.to have_many(:articles).through(:article_bag_articles) }
end

# == Schema Information
#
# Table name: article_bags
#
#  id         :integer          not null, primary key
#  name       :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  topic_id   :integer          not null
#
# Indexes
#
#  index_article_bags_on_topic_id  (topic_id)
#
# Foreign Keys
#
#  topic_id  (topic_id => topics.id)
#
