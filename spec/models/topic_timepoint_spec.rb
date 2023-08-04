# frozen_string_literal: true

require 'rails_helper'

RSpec.describe TopicTimepoint do
  it { is_expected.to belong_to(:topic) }
  it { is_expected.to have_many(:topic_article_timepoints) }
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
#  attributed_token_count_delta      :integer
#  average_wp10_prediction           :float
#  length                            :integer
#  length_delta                      :integer
#  revisions_count                   :integer
#  revisions_count_delta             :integer
#  timestamp                         :date
#  token_count                       :integer
#  token_count_delta                 :integer
#  wp10_prediction                   :float
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
