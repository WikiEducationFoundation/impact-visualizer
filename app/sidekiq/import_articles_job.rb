# frozen_string_literal: true

class ImportArticlesJob
  include Sidekiq::Job
  include Sidekiq::Status::Worker
  sidekiq_options queue: 'import'

  def perform(topic_id)
    topic = Topic.find topic_id
    import_service = ImportService.new(topic:)
    import_service.import_articles(total: method(:total), at: method(:at))
    topic.reload.update(article_import_job_id: nil)
  end
end
