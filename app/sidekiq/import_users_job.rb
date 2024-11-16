# frozen_string_literal: true

class ImportUsersJob
  include Sidekiq::Job
  include Sidekiq::Status::Worker
  sidekiq_options queue: 'import'

  def perform(topic_id)
    topic = Topic.find topic_id
    import_service = ImportService.new(topic:)
    import_service.import_users(total: method(:total), at: method(:at))
    topic.reload.update(users_import_job_id: nil)
  end
end
