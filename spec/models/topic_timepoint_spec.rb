# frozen_string_literal: true

require 'rails_helper'

RSpec.describe TopicTimepoint do
  it { is_expected.to belong_to(:topic) }
  it { is_expected.to have_many(:topic_article_timepoints) }

  describe 'validations' do
    it 'validates classifications json' do
      topic_timepoint = build(:topic_timepoint, classifications: nil)
      expect(topic_timepoint.valid?).to eq(false)
      expect(topic_timepoint.errors.full_messages.first)
        .to include('Classifications does not comply to JSON Schema')

      topic_timepoint.classifications = [{
        name: 'Gender'
      }]

      # Invalid, missing properties
      expect(topic_timepoint.valid?).to eq(false)

      topic_timepoint.classifications = [{
        count: 1,
        count_delta: 0,
        id: 123,
        name: 'Biography',
        properties: [{
          name: 'Gender',
          property_id: 'P21',
          slug: 'gender',
          segments: false
        }]
      }]

      # Valid, complete properties
      expect(topic_timepoint.valid?).to eq(true)

      topic_timepoint.classifications = [{
        count: 1,
        count_delta: 0,
        id: 123,
        name: 'Biography',
        properties: [{
          name: 'Gender',
          property_id: 'P21',
          slug: 'gender',
          segments: {
            'Q48270' => 1,
            'Q6581072' => 1371,
            'Q6581097' => 3
          }
        }]
      }]

      # Valid, complete properties
      expect(topic_timepoint.valid?).to eq(true)

      topic_timepoint.classifications = [{
        count: 1,
        count_delta: 0,
        id: 123,
        name: 'Biography',
        properties: [{
          name: 'Gender',
          property_id: 'P21',
          slug: 'gender',
          segments: {
            'Q48270' => 1,
            'Q6581072' => 1371,
            'Q6581097' => 3
          }
        }],
        extra: 'NOPE!'
      }]

      # Invalid, extra property
      expect(topic_timepoint.valid?).to eq(false)
    end
  end
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
#  average_wp10_prediction           :float
#  classifications                   :jsonb
#  length                            :integer
#  length_delta                      :integer
#  revisions_count                   :integer
#  revisions_count_delta             :integer
#  timestamp                         :date
#  token_count                       :integer
#  token_count_delta                 :integer
#  wp10_prediction_categories        :jsonb
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
