# frozen_string_literal: true

class ImportArticlesJob
  include Sidekiq::Job
  # include Sidekiq::Status::Worker
  sidekiq_options queue: 'import'

  def perform(topic_id)
    @expiration = 60 * 60 * 24 * 30
    
    topic = Topic.find topic_id
    import_service = ImportService.new(topic:)
    # import_service.import_articles(total: method(:total), at: method(:at))
    import_service.import_articles
    topic.reload.update(article_import_job_id: nil)
  end

  def expiration
    @expiration = 60 * 60 * 24 * 30
  end
end
