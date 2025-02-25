# frozen_string_literal: true

class GenerateTimepointsJob
  include Sidekiq::Job
  # include Sidekiq::Status::Worker
  sidekiq_options queue: 'timepoints'

  def perform(topic_id, force_updates = false)
    @expiration = 60 * 60 * 24 * 30

    topic = Topic.find_by(id: topic_id)
    force_updates = ActiveModel::Type::Boolean.new.cast(force_updates)
    # timepoint_service = TimepointService.new(
    #   topic:, force_updates:, logging_enabled: true,
    #   total: method(:total), at: method(:at)
    # )
    timepoint_service = TimepointService.new(
      topic:, force_updates:, logging_enabled: true
    )
    timepoint_service.build_timepoints
    TopicSummaryService.new(topic:).create_summary
    topic.reload.update(timepoint_generate_job_id: nil)
  end

  def expiration
    @expiration = 60 * 60 * 24 * 30
  end
end
