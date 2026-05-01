# frozen_string_literal: true

require 'rails_helper'

RSpec.describe GenerateArticleAnalyticsJob, type: :job do
  let!(:wiki) { Wiki.find_or_create_by!(language: 'en', project: 'wikipedia') }

  describe '#perform — auto-chain to incremental_topic_build' do
    context 'for a Topic Builder topic' do
      let(:topic) do
        create(:topic, wiki: wiki, tb_handle: 'tbp_abc123',
                       start_date: Date.new(2024, 1, 1), end_date: Date.new(2024, 12, 31))
      end

      it 'queues IncrementalTopicBuildJob at the tail (empty article bag short-circuit)' do
        expect {
          described_class.new.perform(topic.id)
        }.to change(IncrementalTopicBuildJob.jobs, :size).by(1)
      end
    end

    context 'for a CSV-driven topic (no tb_handle)' do
      let(:topic) do
        create(:topic, wiki: wiki, tb_handle: nil,
                       start_date: Date.new(2024, 1, 1), end_date: Date.new(2024, 12, 31))
      end

      it 'does not auto-queue IncrementalTopicBuildJob' do
        expect {
          described_class.new.perform(topic.id)
        }.to change(IncrementalTopicBuildJob.jobs, :size).by(0)
      end
    end

    context 'for a TB topic that already has a build in flight' do
      let(:topic) do
        create(:topic, wiki: wiki, tb_handle: 'tbp_abc123',
                       incremental_topic_build_job_id: 'in-flight',
                       start_date: Date.new(2024, 1, 1), end_date: Date.new(2024, 12, 31))
      end

      it 'does not queue a second IncrementalTopicBuildJob' do
        expect {
          described_class.new.perform(topic.id)
        }.to change(IncrementalTopicBuildJob.jobs, :size).by(0)
      end
    end
  end
end
