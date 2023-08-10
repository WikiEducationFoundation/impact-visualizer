# frozen_string_literal: true

class ArticleStatsService
  def initialize(wiki = nil)
    wiki ||= Wiki.default_wiki
    @wiki = wiki
    @wiki_action_api = WikiActionApi.new(wiki)
    @wiki_rest_api = WikiRestApi.new(wiki)
    @lift_wing_api = LiftWingApi.new(wiki)
  end

  def update_title_for_article(article:)
    page_info = @wiki_action_api.get_page_info(pageid: article.pageid)
    article.update(title: page_info['title'])
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
    return unless first_revision
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
    timestamp = article_timepoint.timestamp
    pageid = article.pageid
    title = article.title

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
    revision = @wiki_action_api.get_page_revision_at_timestamp(pageid:, timestamp:)

    # Get count of Revisions at timestamp
    revisions_count = @wiki_rest_api.get_page_edits_count(
      page_title: title,
      from_rev_id: article.first_revision_id,
      to_rev_id: revision['revid']
    )

    # Get the wp10 quality prediction
    quality = weighted_revision_quality(revision_id: revision['revid'])

    # Get count of tokens at revision
    # token_count = ArticleTokenService.count_all_tokens(revision_id: revision['revid'], wiki: @wiki)

    # Update the ArticleTimepoint
    article_timepoint.update(
      article_length: revision['size'],
      revision_id: revision['revid'],
      revisions_count: revisions_count['count'] || 0,
      wp10_prediction: quality
    )
  end

  def weighted_revision_quality(revision_id:)
    probabilities = @lift_wing_api.get_revision_quality(revision_id)
    return nil unless probabilities
    language = @wiki.language
    OresScoreTransformer.weighted_mean_score_from_probabilities(probabilities:, language:)
  end
end
