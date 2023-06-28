# frozen_string_literal: true

class ArticleStatsService
  def initialize
    @wiki_api = WikiApi.new
  end

  def update_stats_for_article_timepoint(article_timepoint:)
    # Setup some variables
    article = article_timepoint.article
    pageid = article.pageid
    timestamp = article_timepoint.timestamp

    # Raise if the article doesn't have a "pageid"
    raise ImpactVisualizerErrors::ArticleMissingPageid unless pageid

    # Get the Revision at timestamp
    revision = @wiki_api.get_revision_at_timestamp(pageid:, timestamp:)

    # Update the ArticleTimepoint with Revision stats
    article_timepoint.update(
      article_length: revision['size'],
      revision_id: revision['revid']
    )
  end
end
