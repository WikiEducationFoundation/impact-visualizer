require 'rails_helper'

RSpec.describe TopicTimepoint, type: :model do
  it { should belong_to(:topic) }
  it { should have_many(:topic_article_timepoints) }
end

# == Schema Information
#
# Table name: topic_timepoints
#
#  id                                :integer          not null, primary key
#  articles_count                    :integer
#  articles_count_delta              :integer
#  attributed_articles_created_delta :integer
#  attributed_length_delta           :integer
#  attributed_links_count_delta      :integer
#  attributed_revisions_count_delta  :integer
#  length                            :integer
#  length_delta                      :integer
#  links_count                       :integer
#  links_count_delta                 :integer
#  revisions_count                   :integer
#  revisions_count_delta             :integer
#  created_at                        :datetime         not null
#  updated_at                        :datetime         not null
#  topic_id                          :integer          not null
#
# Indexes
#
#  index_topic_timepoints_on_topic_id  (topic_id)
#
# Foreign Keys
#
#  topic_id  (topic_id => topics.id)
#
