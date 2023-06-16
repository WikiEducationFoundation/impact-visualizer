require 'rails_helper'

RSpec.describe ArticleBag, type: :model do
  it { should belong_to(:topic) }
  it { should have_many(:article_bag_articles) }
  it { should have_many(:articles).through(:article_bag_articles) }
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
