# frozen_string_literal: true
require 'rails_helper'

RSpec.describe IncrementalTopicBuildJob, type: :job do
  let(:topic) { create(:topic, start_date: Date.new(2013, 1, 1), end_date: Date.new(2014, 1, 1)) }

  it 'hands off to TimepointService with defaults (:classify, queue_next_stage=false, force_updates=false)' do
    Sidekiq::Testing.inline!
    expect(TimepointService).to receive(:new).with(
      topic:,
      force_updates: false,
      logging_enabled: false,
      total: kind_of(Method),
      at: kind_of(Method)
    ).and_call_original
    expect_any_instance_of(TimepointService).to receive(:incremental_build)
      .with(:classify, queue_next_stage: false)
    described_class.new.perform(topic.id)
  end

  it 'hands off to TimepointService (:classify, queue_next_stage=true)' do
    Sidekiq::Testing.inline!
    expect(TimepointService).to receive(:new).with(
      topic:,
      force_updates: false,
      logging_enabled: false,
      total: kind_of(Method),
      at: kind_of(Method)
    ).and_call_original
    expect_any_instance_of(TimepointService).to receive(:incremental_build)
      .with(:classify, queue_next_stage: true)
    described_class.new.perform(topic.id, 'classify', true, false)
  end

  it 'hands off to TimepointService (:article_timepoints, queue_next_stage=true, force_updates=true)' do
    Sidekiq::Testing.inline!
    expect(TimepointService).to receive(:new).with(
      topic:,
      force_updates: true,
      logging_enabled: false,
      total: kind_of(Method),
      at: kind_of(Method)
    ).and_call_original
    expect_any_instance_of(TimepointService).to receive(:incremental_build)
      .with(:article_timepoints, queue_next_stage: true)
    described_class.new.perform(topic.id, 'article_timepoints', true, true)
  end
end
