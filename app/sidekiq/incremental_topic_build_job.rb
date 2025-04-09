# frozen_string_literal: true

class IncrementalTopicBuildJob
  include Sidekiq::Job
  include Sidekiq::Status::Worker
  sidekiq_options queue: 'timepoints'

  def perform(topic_id, stage = TimepointService::STAGES.first,
              queue_next_stage = false, force_updates = false)
    @expiration = 60 * 60 * 24 * 30
    store stage: stage
    job_id = @provider_job_id || @job_id || @jid
    topic = Topic.find_by(id: topic_id)
    topic.update incremental_topic_build_job_id: job_id

    force_updates = ActiveModel::Type::Boolean.new.cast(force_updates)
    queue_next_stage = ActiveModel::Type::Boolean.new.cast(queue_next_stage)

    begin
      timepoint_service = TimepointService.new(
        topic:, force_updates:, logging_enabled: Rails.env.development?,
        total: method(:total), at: method(:at)
      )
      timepoint_service.incremental_build(stage.to_sym, queue_next_stage:)
    rescue StandardError => e
      topic.update(incremental_topic_build_job_id: nil)
      raise e
    end

    topic.update(incremental_topic_build_job_id: nil)
  end

  def expiration
    @expiration = 60 * 60 * 24 * 30
  end
end
