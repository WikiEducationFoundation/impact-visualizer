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

  def update_stats_for_topic_article_timepoint(topic_article_timepoint:)
    # Setup some variables
    timestamp = topic_article_timepoint.timestamp
    topic = topic_article_timepoint.topic
    article = topic_article_timepoint.article
    article_timepoint = topic_article_timepoint.article_timepoint

    # Get previous timestamp
    previous_timestamp = topic.timestamp_previous_to(timestamp)

    # Get article_timepoint associated with previous timestamp
    previous_article_timepoint = ArticleTimepoint.find_by(article:, timestamp: previous_timestamp)

    if previous_timestamp && previous_article_timepoint
      # Calculate diffs based on previous article_timepoint and current article_timepoint
      length_delta = article_timepoint.article_length - previous_article_timepoint.article_length
    else
      # If no previous, this must be the first
      length_delta = article_timepoint.article_length
    end

    # Update accordingly
    topic_article_timepoint.update(length_delta:)
  end
end
