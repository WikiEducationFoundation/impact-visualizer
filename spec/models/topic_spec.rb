# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Topic do
  it { is_expected.to have_many(:article_bags) }
  it { is_expected.to have_many(:articles).through(:article_bags) }
  it { is_expected.to have_many(:topic_users) }
  it { is_expected.to have_many(:users).through(:topic_users) }
  it { is_expected.to have_many(:topic_timepoints) }
  it { is_expected.to belong_to(:wiki) }

  describe '#timestamps' do
    let(:topic) { create(:topic) }

    it 'returns the correct dates within timeframe, with default interval' do
      start_date = Date.new(2023, 1, 1)
      end_date = start_date + 30.days
      topic.update(start_date:, end_date:)
      schedule = topic.timestamps
      expect(schedule.count).to eq(4)
      expect(schedule.first).to eq(Date.new(2023, 1, 1))
      expect(schedule.last).to eq(Date.new(2023, 1, 22))
    end

    it 'returns the correct dates within timeframe, with custom interval' do
      start_date = Date.new(2023, 1, 1)
      end_date = start_date + 30.days
      topic.update(start_date:, end_date:, timepoint_day_interval: 1)
      schedule = topic.timestamps
      expect(schedule.count).to eq(30)
      expect(schedule.first).to eq(Date.new(2023, 1, 1))
      expect(schedule.last).to eq(Date.new(2023, 1, 30))
    end

    it 'returns the correct dates within timeframe, with no end_date, and uses NOW' do
      Timecop.freeze(Date.new(2023, 1, 30)) do
        start_date = Date.new(2023, 1, 1)
        topic.update(start_date:, end_date: nil)
        schedule = topic.timestamps
        expect(schedule.count).to eq(4)
        expect(schedule.first).to eq(Date.new(2023, 1, 1))
        expect(schedule.last).to eq(Date.new(2023, 1, 22))
      end
    end

    it 'raises with missing start_date' do
      topic.update(start_date: nil, end_date: nil)
      expect { topic.timestamps }
        .to raise_error(ImpactVisualizerErrors::TopicMissingStartDate)
    end
  end
end

# == Schema Information
#
# Table name: topics
#
#  id                     :integer          not null, primary key
#  description            :string
#  end_date               :datetime
#  name                   :string
#  slug                   :string
#  start_date             :datetime
#  timepoint_day_interval :integer          default(7)
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  wiki_id                :integer
#
