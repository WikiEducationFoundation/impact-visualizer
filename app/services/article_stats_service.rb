# frozen_string_literal: true

class ArticleStatsService
  def initialize
    @wiki_action_api = WikiActionApi.new
    @wiki_rest_api = WikiRestApi.new
  end

  def update_details_for_article(article:)
    # Grab the title, if necessary
    if article.pageid && !article.title
      page_info = @wiki_action_api.get_page_info(pageid: article.pageid)
      article.update(title: page_info['title'])
    end

    # Grab the pageid, if necessary
    if article.title && !article.pageid
      page_info = @wiki_action_api.get_page_info(title: article.title)
      article.update(pageid: page_info['pageid'])
    end

    # Grab details about first revision, if necessary
    update_first_revision_info(article:) unless article.first_revision_info?

    article.reload
  end

  def update_first_revision_info(article:)
    first_revision = @wiki_action_api.get_first_revision(pageid: article.pageid)
    article.update(
      first_revision_id: first_revision['revid'],
      first_revision_at: first_revision['timestamp'],
      first_revision_by_name: first_revision['user'],
      first_revision_by_id: first_revision['userid']
    )
  end

  def update_stats_for_article_timepoint(article_timepoint:)
    # Setup some variables
    article = article_timepoint.article
    pageid = article.pageid
    title = article.title
    timestamp = article_timepoint.timestamp

    # Raise if the article doesn't have a "pageid" or "title"
    raise ImpactVisualizerErrors::ArticleMissingPageid unless pageid
    raise ImpactVisualizerErrors::ArticleMissingPageTitle unless title
    unless article.first_revision_info?
      raise ImpactVisualizerErrors::ArticleMissingFirstRevisionInfo
    end
    unless article.exists_at_timestamp?(timestamp)
      raise ImpactVisualizerErrors::ArticleCreatedAfterTimestamp
    end

    # Get the Revision at timestamp
    revision = @wiki_action_api.get_revision_at_timestamp(pageid:, timestamp:)

    # Get count of Revisions at timestamp
    revisions_count = @wiki_rest_api.get_page_edits_count(
      page_title: title,
      from_rev_id: article.first_revision_id,
      to_rev_id: revision['revid']
    )

    # Update the ArticleTimepoint
    article_timepoint.update(
      article_length: revision['size'],
      revision_id: revision['revid'],
      revisions_count: revisions_count['count']
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
      length_delta =
        article_timepoint.article_length - previous_article_timepoint.article_length
      revisions_count_delta =
        article_timepoint.revisions_count - previous_article_timepoint.revisions_count
    else
      # If no previous, this must be the first
      length_delta = 0
      revisions_count_delta = 0
    end

    # Update accordingly
    topic_article_timepoint.update(length_delta:, revisions_count_delta:)
  end
end
