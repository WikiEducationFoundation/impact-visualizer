# frozen_string_literal: true

require 'rails_helper'
require './spec/support/shared_contexts'

describe TopicSummaryService do
  describe '.initialize' do
    let(:topic) { create(:topic) }

    it 'initializes and has @topic variable' do
      topic_summary_service = described_class.new(topic:)
      expect(topic_summary_service).to be_a(described_class)
      expect(topic_summary_service.topic).to eq(topic)
    end
  end

  describe '#create_summary' do
    # This shared context sets 3 topic_timepoints
    include_context 'three topic_timepoints'

    before do
      allow(topic).to receive(:articles_count).and_return(30)
    end

    it 'summarizes all topic activity' do
      topic_summary_service = described_class.new(topic:)
      summary = topic_summary_service.create_summary
      expect(topic.topic_timepoints.count).to eq(3)
      expect(summary).to have_attributes(
        articles_count: 30,
        articles_count_delta: 20,
        attributed_articles_created_delta: 10,
        attributed_length_delta: 200,
        attributed_revisions_count_delta: 10,
        attributed_token_count: 10,
        average_wp10_prediction: 20.0,
        length: 900,
        length_delta: 600,
        revisions_count: 220,
        revisions_count_delta: 20,
        token_count: 300,
        token_count_delta: 200
      )
      expect(summary.wp10_prediction_categories).to eq({ 'A' => 2, 'B' => 2, 'C' => 2 })
    end
  end
end
