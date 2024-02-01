# frozen_string_literal: true
require 'rails_helper'

RSpec.describe GenerateTimepointsJob, type: :job do
  let(:topic) { create(:topic, start_date: Date.new(2013, 1, 1), end_date: Date.new(2014, 1, 1)) }

  it 'hands off to TimepointService' do
    Sidekiq::Testing.inline!
    expect(TimepointService).to receive(:new).with(
      topic:,
      force_updates: false,
      logging_enabled: false,
      total: kind_of(Method),
      at: kind_of(Method)
    ).and_call_original
    expect(TopicSummaryService).to receive(:new).with(topic:).and_call_original
    expect_any_instance_of(TimepointService).to receive(:build_timepoints)
    expect_any_instance_of(TopicSummaryService).to receive(:create_summary)
    expect_any_instance_of(Topic).to receive(:update).with(timepoint_generate_job_id: nil)
    described_class.new.perform(topic.id)
  end
end
