# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Topic do
  it { is_expected.to have_many(:article_bags) }
  it { is_expected.to have_many(:articles).through(:article_bags) }
  it { is_expected.to have_many(:topic_users) }
  it { is_expected.to have_many(:users).through(:topic_users) }
  it { is_expected.to have_many(:topic_timepoints) }
  it { is_expected.to have_many(:topic_summaries) }
  it { is_expected.to belong_to(:wiki) }

  describe '#queue_generate_timepoints' do
    let(:topic) { create(:topic) }

    it 'queues GenerateTimepointsJob for Topic' do
      expect(GenerateTimepointsJob).to receive(:perform_async).and_return('abc123')
      topic.queue_generate_timepoints
      expect(topic.reload.timepoint_generate_job_id).to eq('abc123')
    end
  end

  describe '#queue_articles_import' do
    let(:topic) { create(:topic) }

    it 'queues ImportArticlesJob for Topic' do
      expect(ImportArticlesJob).to receive(:perform_async).and_return('abc123')
      topic.queue_articles_import
      expect(topic.reload.article_import_job_id).to eq('abc123')
    end
  end

  describe '#queue_users_import' do
    let(:topic) { create(:topic) }

    it 'queues ImportUsersJob for Topic' do
      expect(ImportUsersJob).to receive(:perform_async).and_return('abc123')
      topic.queue_users_import
      expect(topic.reload.users_import_job_id).to eq('abc123')
    end
  end

  describe '#timestamps' do
    let(:topic) { create(:topic, timepoint_day_interval: 7) }

    it 'returns the correct dates within timeframe, with default interval' do
      start_date = Date.new(2023, 1, 1)
      end_date = start_date + 30.days
      topic.update(start_date:, end_date:)
      schedule = topic.timestamps
      expect(schedule.count).to eq(6)
      expect(schedule.first).to eq(Date.new(2023, 1, 1))
      expect(schedule.last).to eq(Date.new(2023, 1, 31))
    end

    it 'returns the correct dates within timeframe, with custom interval' do
      start_date = Date.new(2023, 1, 1)
      end_date = start_date + 30.days
      topic.update(start_date:, end_date:, timepoint_day_interval: 1)
      schedule = topic.timestamps
      expect(schedule.count).to eq(31)
      expect(schedule.first).to eq(Date.new(2023, 1, 1))
      expect(schedule.last).to eq(Date.new(2023, 1, 31))
    end

    it 'raises with missing start_date' do
      topic.update(start_date: nil, end_date: Time.zone.now)
      expect { topic.timestamps }
        .to raise_error(ImpactVisualizerErrors::TopicMissingStartDate)
    end

    it 'raises with missing end_date' do
      topic.update(start_date: Time.zone.now, end_date: nil)
      expect { topic.timestamps }
        .to raise_error(ImpactVisualizerErrors::TopicMissingEndDate)
    end
  end

  describe '#timestamp_previous_to' do
    let(:start_date) { Date.new(2023, 1, 1) }
    let(:end_date) { start_date + 30.days }
    let(:topic) { create(:topic, start_date:, end_date:) }

    it 'returns the timestamp previous to the provided timestamp' do
      expect(topic.timestamp_previous_to(Date.new(2023, 1, 8))).to eq(Date.new(2023, 1, 1))
    end

    it 'returns nil if the provided timestamp is the first' do
      expect(topic.timestamp_previous_to(Date.new(2023, 1, 1))).to eq(nil)
    end

    it 'still works if end_date is not midnight' do
      start_date = Date.new(2001, 1, 1)
      end_date = Date.new(2023, 11, 28) + 8.hours
      test_date = Date.new(2023, 11, 28)
      timepoint_day_interval = 365
      topic = create(:topic, start_date:, end_date:, timepoint_day_interval:)
      expect(topic.timestamp_previous_to(test_date)).to eq(Date.new(2022, 12, 27))
    end

    it 'raises if provided timestamp is not valid' do
      expect do
        topic.timestamp_previous_to(Date.new(2022, 1, 2))
      end.to raise_error(ImpactVisualizerErrors::InvalidTimestampForTopic)
    end
  end

  describe '#timestamp_next_to' do
    let(:start_date) { Date.new(2023, 1, 1) }
    let(:end_date) { start_date + 30.days }
    let(:topic) { create(:topic, start_date:, end_date:) }

    it 'returns the next timestamp following the provided timestamp' do
      expect(topic.timestamp_next_to(Date.new(2023, 1, 8))).to eq(Date.new(2023, 1, 15))
    end

    it 'returns nil if the provided timestamp is the last' do
      expect(topic.timestamp_next_to(end_date)).to eq(nil)
    end

    it 'raises if provided timestamp is not valid' do
      expect do
        topic.timestamp_next_to(Date.new(2024, 1, 2))
      end.to raise_error(ImpactVisualizerErrors::InvalidTimestampForTopic)
    end
  end

  describe '#first_timestamp' do
    let(:start_date) { Date.new(2023, 1, 1) }
    let(:end_date) { start_date + 30.days }
    let(:topic) { create(:topic, start_date:, end_date:) }

    it 'returns the next timestamp following the provided timestamp' do
      expect(topic.first_timestamp).to eq(Date.new(2023, 1, 1))
    end
  end

  describe '#user_with_wiki_id' do
    let!(:topic) { create(:topic) }
    let!(:user) { create(:user, wiki_user_id: 123) }
    let!(:topic_user) { create(:topic_user, topic:, user:) }

    it 'returns an associated User with the given wiki userid' do
      found_user = topic.user_with_wiki_id(123)
      expect(found_user).to eq(user)
    end

    it 'returns nil if no associated User with the given wiki userid' do
      found_user = topic.user_with_wiki_id(234)
      expect(found_user).to eq(nil)
    end
  end
end

# == Schema Information
#
# Table name: topics
#
#  id                        :bigint           not null, primary key
#  chart_time_unit           :string           default("year")
#  description               :string
#  display                   :boolean          default(FALSE)
#  editor_label              :string           default("participant")
#  end_date                  :datetime
#  name                      :string
#  slug                      :string
#  start_date                :datetime
#  timepoint_day_interval    :integer          default(7)
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#  article_import_job_id     :string
#  timepoint_generate_job_id :string
#  users_import_job_id       :string
#  wiki_id                   :integer
#
