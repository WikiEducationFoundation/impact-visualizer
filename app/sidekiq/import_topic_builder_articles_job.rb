# frozen_string_literal: true

# Background article-ingestion for a Topic Builder handoff. The
# ImportsController creates the Topic + empty ArticleBag synchronously
# (so the user gets an instant redirect to the new topic page) and then
# enqueues this job to populate ArticleBagArticles row-by-row.
class ImportTopicBuilderArticlesJob
  include Sidekiq::Job
  include Sidekiq::Status::Worker
  sidekiq_options queue: 'import', retry: 3

  # When all retries are spent, clear article_import_job_id so the topic
  # isn't permanently stuck in a "queued" state. The user can then delete
  # and re-import (or, future-self, click a Retry button).
  sidekiq_retries_exhausted do |msg, _ex|
    topic_id = msg['args'].first
    # rubocop:disable Rails/SkipsModelValidations -- clearing a job-tracking
    # column in bulk; no validations or callbacks should run for this.
    Topic.where(id: topic_id).update_all(article_import_job_id: nil)
    # rubocop:enable Rails/SkipsModelValidations
  end

  EXPIRATION_SECONDS = 60 * 60 * 24 * 30

  def perform(topic_id, handle)
    @expiration = EXPIRATION_SECONDS
    store(started_at: Time.now.to_i)

    topic = Topic.find(topic_id)
    bag = topic.active_article_bag
    raise "Topic #{topic_id} has no active article bag" unless bag

    package = TopicBuilderPackageService.fetch(handle)
    TopicBuilderPackageService.assert_supported_schema!(package)

    entries = package.fetch('articles', [])
    total(entries.size)

    entries.each_with_index do |entry, idx|
      ingest_one(bag, topic.wiki, entry)
      at(idx + 1)
    end

    TopicBuilderTagIngestService.new(topic:, package:).sync!

    topic.reload.update(article_import_job_id: nil)

    # The TB handoff is meant to be a one-click flow: after the user
    # clicks Import, they should land on the topic page and watch all
    # the data populate without further intervention. Kick off article
    # analytics; that job, on completion, will queue the timepoint
    # build pipeline. The two used to run in parallel, but the
    # combined burst (5 analytics threads + 10 timepoint threads
    # against enwiki) caused enough 429s that downstream threads
    # exhausted retries and silently lost data. Sequential keeps the
    # peak concurrent thread count at 10, matching what's been
    # production-stable.
    topic.queue_generate_article_analytics
  end

  def expiration
    @expiration ||= EXPIRATION_SECONDS
  end

  private

  def ingest_one(bag, wiki, entry)
    title = entry['title'].to_s
    return if title.empty?

    article = Article.find_or_create_by!(title:, wiki:)
    ArticleBagArticle.find_or_create_by!(article_bag: bag, article:) do |aba|
      aba.centrality = entry['centrality']
    end
  end
end
