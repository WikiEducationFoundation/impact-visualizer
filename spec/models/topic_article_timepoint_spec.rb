# frozen_string_literal: true

require 'rails_helper'
require './spec/support/shared_contexts'

RSpec.describe TopicArticleTimepoint do
  it { is_expected.to belong_to(:topic_timepoint) }
  it { is_expected.to belong_to(:article_timepoint) }

  describe '#find_by_topic_article_and_timestamp' do
    # This shared context sets up 1 Topic with 2 Articles and 2 Timepoints
    include_context 'topic with two timepoints'

    it 'returns the expected timepoint' do
      topic_article_timepoint = described_class.find_by_topic_article_and_timestamp(
        topic:,
        article: article_1,
        timestamp: start_date
      )
      expect(topic_article_timepoint).to eq(start_topic_article_timepoint_1)
    end

    it 'returns nil if none found' do
      topic_article_timepoint = described_class.find_by_topic_article_and_timestamp(
        topic:,
        article: article_1,
        timestamp: Date.new(2023, 1, 2)
      )
      expect(topic_article_timepoint).to be_nil
    end
  end
end

# == Schema Information
#
# Table name: topic_article_timepoints
#
#  id                               :bigint           not null, primary key
#  attributed_creation_at           :datetime
#  attributed_length_delta          :integer
#  attributed_revisions_count_delta :integer
#  attributed_token_count           :integer
#  attributed_token_count_delta     :integer
#  initial_attributed_token_count   :integer
#  length_delta                     :integer
#  revisions_count_delta            :integer
#  token_count_delta                :integer
#  created_at                       :datetime         not null
#  updated_at                       :datetime         not null
#  article_timepoint_id             :bigint           not null
#  attributed_creator_id            :bigint
#  topic_timepoint_id               :bigint           not null
#
# Indexes
#
#  index_topic_article_timepoints_on_article_timepoint_id   (article_timepoint_id)
#  index_topic_article_timepoints_on_attributed_creator_id  (attributed_creator_id)
#  index_topic_article_timepoints_on_topic_timepoint_id     (topic_timepoint_id)
#
# Foreign Keys
#
#  fk_rails_...  (article_timepoint_id => article_timepoints.id)
#  fk_rails_...  (attributed_creator_id => users.id)
#  fk_rails_...  (topic_timepoint_id => topic_timepoints.id)
#
