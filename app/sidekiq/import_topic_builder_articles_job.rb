# frozen_string_literal: true

# Background article-ingestion for a Topic Builder handoff. The
# ImportsController creates the Topic + empty ArticleBag synchronously
# (so the user gets an instant redirect to the new topic page) and then
# enqueues this job to populate ArticleBagArticles row-by-row.
class ImportTopicBuilderArticlesJob
  include Sidekiq::Job
  include Sidekiq::Status::Worker
  sidekiq_options queue: 'import', retry: 3

  EXPIRATION_SECONDS = 60 * 60 * 24 * 30

  def perform(topic_id, handle)
    @expiration = EXPIRATION_SECONDS

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

    topic.reload.update(article_import_job_id: nil)

    # The TB handoff is meant to be a one-click flow: after the user
    # clicks Import, they should land on the topic page and watch all
    # the data populate without further intervention. Kick off article
    # analytics and the full incremental timepoint build pipeline in
    # parallel; both jobs lazily populate per-article details on the
    # fly when they encounter an article without them.
    topic.queue_generate_article_analytics
    topic.queue_incremental_topic_build(queue_next_stage: true, force_updates: false)
  end

  def expiration
    @expiration ||= EXPIRATION_SECONDS
  end

  private

  def ingest_one(bag, wiki, entry)
    title = entry['title'].to_s
    return if title.empty?

    article = Article.find_or_create_by!(title: title, wiki: wiki)
    ArticleBagArticle.find_or_create_by!(article_bag: bag, article: article) do |aba|
      aba.centrality = entry['centrality']
    end
  end
end
