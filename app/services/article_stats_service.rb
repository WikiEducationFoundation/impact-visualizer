# frozen_string_literal: true

class ArticleStatsService
  def initialize(wiki)
    @wiki = wiki
    @wiki_action_api = WikiActionApi.new(wiki)
    @visualizer_tools_api = VisualizerToolsApi.new(wiki)
    @lift_wing_api = LiftWingApi.new(wiki) if LiftWingApi.valid_wiki?(wiki)
    @wikimedia_pageviews_api = WikimediaPageviewsApi.new(wiki)
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

    # Mark as missing, if necessary
    missing = article.pageid.nil?
    article.update(missing:) if missing != article.missing

    # Grab details about first revision, if necessary
    update_first_revision_info(article:) unless article.first_revision_info?

    article.reload
  end

  def update_first_revision_info(article:)
    return unless article.pageid
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

    # If no revision, article probably was deleted
    return unless revision
    # FIXME: If the text is hidden (ie, the revison content was deleted), ideally we should find
    # the first prior revision that isn't deleted. Until that is implemeted, we'll treat this
    # the same way as a deleted article.
    # We don't actually need the whole text, so we just request the sha1 to see whether the text
    # is deleted; if so, `sha1hidden` will be in the revision data.
    return if revision['sha1hidden']

    # Get count of Revisions at timestamp
    revisions_count = @visualizer_tools_api.get_page_edits_count(
      page_id: pageid,
      from_rev_id: article.first_revision_id,
      to_rev_id: revision['revid']
    )

    # Get the wp10 quality prediction
    weighted_quality = nil
    predicted_category = nil

    if @lift_wing_api
      begin
        lift_wing_response = @lift_wing_api.get_revision_quality(revision['revid'])
        weighted_quality = weighted_revision_quality(lift_wing_response:)
        predicted_category = lift_wing_response['prediction']
      rescue StandardError => e
        puts "LiftWing Failure for revision: #{revision['revid']}, article: #{article.id}, article_timepoint: #{article_timepoint}"
      end
    end

    # Update the ArticleTimepoint
    article_timepoint.update(
      article_length: revision['size'],
      revision_id: revision['revid'],
      revisions_count: revisions_count || 0,
      wp10_prediction: weighted_quality,
      wp10_prediction_category: predicted_category
    )
  end

  def update_token_stats(article_timepoint:, tokens:)
    revision_id = article_timepoint.revision_id
    start_revision_id = article_timepoint.first_revision_id
    end_revision_id = revision_id
    wiki = @wiki

    # Get count of tokens at revision
    token_count = ArticleTokenService.count_all_tokens_within_range(
      tokens:, revision_id:, wiki:, start_revision_id:, end_revision_id:, start_inclusive: true
    )

    article_timepoint.update(token_count:)
  end

  def weighted_revision_quality(lift_wing_response:)
    return nil unless lift_wing_response
    probabilities = lift_wing_response['probability']
    return nil unless probabilities
    language = @wiki.language
    OresScoreTransformer.weighted_mean_score_from_probabilities(probabilities:, language:)
  end

  def get_average_daily_views(
    article:,
    year:,
    start_month: 1,
    start_day: 1,
    end_month: 12,
    end_day: 31
  )
    title = article.respond_to?(:title) ? article.title : article
    @wikimedia_pageviews_api.get_average_daily_views(
      article: title,
      year:,
      start_month:,
      start_day:,
      end_month:,
      end_day:
    )
  end
end
