# frozen_string_literal: true

require 'rails_helper'

RSpec.describe TopicSummary do
  it { is_expected.to belong_to(:topic) }

  describe 'validations' do
    it 'validates classifications json' do
      topic_summary = build(:topic_summary, classifications: nil)
      expect(topic_summary.valid?).to eq(false)
      expect(topic_summary.errors.full_messages.first)
        .to include('Classifications does not comply to JSON Schema')

      topic_summary.classifications = [{
        name: 'Gender'
      }]

      # Invalid, missing properties
      expect(topic_summary.valid?).to eq(false)

      topic_summary.classifications = [{
        count: 0,
        id: 123,
        name: 'Biography'
      }]

      # Valid, complete properties
      expect(topic_summary.valid?).to eq(true)

      topic_summary.classifications = [{
        count: 1,
        id: 123,
        name: 'Biography'
      }]

      # Valid, complete properties
      expect(topic_summary.valid?).to eq(true)

      topic_summary.classifications = [{
        count: 1,
        id: 123,
        name: 'Biography',
        extra: 'NOPE!'
      }]

      # Invalid, extra property
      expect(topic_summary.valid?).to eq(false)
    end
  end
end

# == Schema Information
#
# Table name: topic_summaries
#
#  id                                :bigint           not null, primary key
#  articles_count                    :integer
#  articles_count_delta              :integer
#  attributed_articles_created_delta :integer
#  attributed_length_delta           :integer
#  attributed_revisions_count_delta  :integer
#  attributed_token_count            :integer
#  average_wp10_prediction           :float
#  classifications                   :jsonb
#  length                            :integer
#  length_delta                      :integer
#  missing_articles_count            :integer
#  revisions_count                   :integer
#  revisions_count_delta             :integer
#  timepoint_count                   :integer
#  token_count                       :integer
#  token_count_delta                 :integer
#  wp10_prediction_categories        :jsonb
#  created_at                        :datetime         not null
#  updated_at                        :datetime         not null
#  topic_id                          :bigint           not null
#
# Indexes
#
#  index_topic_summaries_on_topic_id  (topic_id)
#
# Foreign Keys
#
#  fk_rails_...  (topic_id => topics.id)
#
