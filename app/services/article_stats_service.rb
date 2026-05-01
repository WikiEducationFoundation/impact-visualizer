# frozen_string_literal: true

class ArticleStatsService
  LANGUAGE_LINK_TARGETS = %w[en it fr es de].freeze
  LANGUAGE_LINK_BATCH_SIZE = 50
  LANGUAGE_LINK_MAX_CONCURRENT = 3

  class RateLimitError < StandardError; end
  class FetchError < StandardError; end

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
        puts "LiftWing Failure for revision: #{revision['revid']}, article: #{article.id}, article_timepoint: #{article_timepoint} – #{e.message}"
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
    start_year: Date.current.year,
    end_year: Date.current.year,
    start_month: 1,
    start_day: 1,
    end_month: 12,
    end_day: 31
  )
    title = article.respond_to?(:title) ? article.title : article
    @wikimedia_pageviews_api.get_average_daily_views(
      article: title,
      start_year:,
      end_year:,
      start_month:,
      start_day:,
      end_month:,
      end_day:
    )
  end

  def get_article_size_at_date(article:, date: Date.current)
    update_details_for_article(article:)

    pageid = article.pageid
    return nil unless pageid

    revision = @wiki_action_api.get_page_revision_at_timestamp(pageid:, timestamp: date)

    revision ? revision['size'] : nil
  rescue StandardError => e
    puts "Error fetching article size for #{article.id || article}: #{e.message}"
    nil
  end

  def get_talk_page_size_at_date(article:, date: Date.current)
    title = article.respond_to?(:title) ? article.title : article
    talk_title = "Talk:#{title}"

    page_info = @wiki_action_api.get_page_info(title: talk_title)
    return nil unless page_info && !page_info['missing']

    pageid = page_info['pageid']
    revision = @wiki_action_api.get_page_revision_at_timestamp(pageid:, timestamp: date)
    return nil unless revision

    Rails.logger.info("[ArticleStatsService] Final talk page size: #{revision['size']}")
    revision['size']
  rescue StandardError => e
    Rails.logger.error("[ArticleStatsService] Error fetching talk page size for #{talk_title}: #{e.message}")
    nil
  end

  def get_lead_section_size_at_date(article:, date: Date.current)
    update_details_for_article(article:)

    pageid = article.pageid
    return nil unless pageid

    revision = @wiki_action_api.get_page_revision_at_timestamp(pageid:, timestamp: date)
    return nil unless revision

    wikitext = @wiki_action_api.get_lead_section_wikitext(pageid:, revision_id: revision['revid'])
    return nil unless wikitext

    wikitext.bytesize
  rescue StandardError => e
    Rails.logger.error("[ArticleStatsService] Error fetching lead section size for #{article.id || article}: #{e.message}")
    nil
  end

  def get_page_assessment_grade(article:)
    title = article.respond_to?(:title) ? article.title : article
    assessments = @wiki_action_api.get_page_assessments(title:)
    ArticleStatsService.project_independent_assessment_class(assessments)
  end

  def get_linguistic_versions_count(article:)
    update_details_for_article(article:)
    return 0 if article.missing

    title = article.title
    return 0 unless title.present?

    other_lang_count = @wiki_action_api.get_langlinks_count(title:)
    # We add 1 here to include the current wiki edition itself
    other_lang_count + 1
  rescue StandardError => e
    Rails.logger.error("[ArticleStatsService] Error fetching linguistic versions count for #{article.id || article}: #{e.message}")
    0
  end

  def get_images_count(article:)
    update_details_for_article(article:)
    return 0 if article.missing

    title = article.title
    return 0 unless title.present?

    @wiki_action_api.get_images_count(title:)
  rescue StandardError => e
    Rails.logger.error("[ArticleStatsService] Error fetching images count for #{article.id || article}: #{e.message}")
    0
  end

  def get_warning_tags_count(article:)
    update_details_for_article(article:)
    return 0 if article.missing

    title = article.title
    return 0 unless title.present?

    templates = @wiki_action_api.get_templates(title:)
    return 0 if templates.empty?

    warning_template_patterns = [
      /\AUnreferenced\z/i,
      /\ARefimprove\z/i,
      /\ARefimprove section\z/i,
      /\AMore citations needed\z/i,
      /\ACleanup\z/i,
      /\APOV\z/i,
      /\AAdvert\z/i,
      /\ANotability\z/i,
      /\ACopy edit\z/i,
      /\ATone\z/i,
      /\AUpdate\z/i,
      /\ADisputed\z/i,
      /\AMultiple issues\z/i,
      /\ACitation needed\z/i,
      /\ACn\z/i
    ]

    templates.count do |t|
      raw_title = t['title'] || t[:title]
      next false unless raw_title.is_a?(String)
      name = raw_title.split(':', 2).last
      warning_template_patterns.any? { |re| re.match?(name) }
    end
  rescue StandardError => e
    Rails.logger.error("[ArticleStatsService] Error fetching warning tags count for #{article.id || article}: #{e.message}")
    0
  end

  def get_number_of_editors(article:)
    update_details_for_article(article:)
    return 0 if article.missing

    pageid = article.pageid
    return 0 unless pageid

    @wiki_action_api.get_unique_editors_count(pageid:)
  rescue StandardError => e
    Rails.logger.error("[ArticleStatsService] Error fetching number_of_editors for #{article.id || article}: #{e.message}")
    0
  end

  def get_incoming_links_count(article:)
    update_details_for_article(article:)
    return 0 if article.missing

    title = article.title
    return 0 unless title.present?

    @wiki_action_api.get_backlinks_count(title:)
  rescue StandardError => e
    Rails.logger.error("[ArticleStatsService] Error fetching incoming links count for #{article.id || article}: #{e.message}")
    0
  end

  def get_article_protections(article:)
    update_details_for_article(article:)
    return [] if article.missing

    pageid = article.pageid
    title = article.title
    return [] unless pageid || title

    pageid ? @wiki_action_api.get_page_protections(pageid:) : @wiki_action_api.get_page_protections(title:)
  rescue StandardError => e
    Rails.logger.error("[ArticleStatsService] Error fetching article protections for #{article.id || article}: #{e.message}")
    []
  end

  def language_links_for_topic(topic)
    article_titles = topic.active_article_bag.articles.pluck(:title)
    Rails.logger.info("[language_links] Topic #{topic.id} (#{topic.name}): #{article_titles.size} articles, wiki=#{@wiki.language}")
    language_links_for_articles(article_titles)
  end

  def language_links_for_articles(article_titles)
    return {} if article_titles.empty?

    result = fetch_language_links_batched(article_titles)
    backfill_missing_articles(result, article_titles)
    result
  end

  def article_comparison(article_title)
    langlinks = @wiki_action_api.get_langlinks_with_titles(title: article_title)
    title_by_lang = resolve_titles_by_language(article_title, langlinks)
    fetch_comparison_stats(title_by_lang)
  end

  def self.best_assessment_class_from_pageassessments(assessments)
    return nil unless assessments.is_a?(Hash) && assessments.any?
    classes = assessments.values.filter_map { |a| a['class'] || a[:class] }
    return nil if classes.empty?
    order = %w[FA FL A GA B C Start Stub]
    classes.min_by { |c| order.index(c) || 999 }
  end

  def self.project_independent_assessment_class(assessments)
    return nil unless assessments.is_a?(Hash) && assessments.any?

    # The empty string key is used by some wikis for project-independent assessments
    info = assessments['']
    cls = info && (info['class'] || info[:class])
    return cls if cls
    # The key for project independent assessments isn't fully consistent across wikis
    # so these are some fallback options.
    preferred_keys = ['Project-independent assessment', 'Project-independent', 'Independent',
                      'General']
    preferred_keys.each do |key|
      info = assessments[key]
      cls = info && (info['class'] || info[:class])
      return cls if cls
    end

    nil
  end

  private

  def fetch_language_links_batched(article_titles)
    wiki_lang = @wiki.language
    batches = article_titles.each_slice(LANGUAGE_LINK_BATCH_SIZE).to_a
    include_own_lang = LANGUAGE_LINK_TARGETS.include?(wiki_lang)

    Rails.logger.info("[language_links] Split into #{batches.size} batches of up to #{LANGUAGE_LINK_BATCH_SIZE}, targets=#{LANGUAGE_LINK_TARGETS.inspect}")

    result = {}
    semaphore = Mutex.new
    errors = []

    batches.each_slice(LANGUAGE_LINK_MAX_CONCURRENT) do |concurrent_group|
      threads = concurrent_group.map do |batch|
        Thread.new(batch) do |titles|
          Rails.logger.info("[language_links] Fetching langlinks for batch (#{titles.size} titles): #{titles.first(5).inspect}#{if titles.size > 5
                                                                                                                                  '...'
                                                                                                                                end}")
          api = WikiActionApi.new(@wiki)
          batch_result = api.get_langlinks(titles:)
          Rails.logger.info("[language_links] Batch response data: #{batch_result.inspect}")
          batch_result
        end
      end

      threads.each do |t|
        batch_links = t.value
        next unless batch_links

        semaphore.synchronize do
          batch_links.each do |title, langs|
            filtered = langs.select { |l| LANGUAGE_LINK_TARGETS.include?(l) }
            filtered << wiki_lang if include_own_lang
            result[title] = filtered.uniq
          end
        end
      rescue MediawikiApi::HttpError => e
        semaphore.synchronize { errors << e }
      rescue StandardError => e
        Rails.logger.error("[language_links] Batch failed: #{e.class} - #{e.message}")
        semaphore.synchronize { errors << e }
      end
    end

    if result.empty? && errors.any?
      raise RateLimitError if errors.any? do |e|
                                e.is_a?(MediawikiApi::HttpError) && e.status == 429
                              end

      raise FetchError, 'Failed to fetch language links from Wikipedia. Please try again later.'
    end

    result
  end

  def backfill_missing_articles(result, article_titles)
    include_own_lang = LANGUAGE_LINK_TARGETS.include?(@wiki.language)
    article_titles.each do |title|
      next if result.key?(title)

      result[title] = include_own_lang ? [@wiki.language] : []
    end
  end

  def resolve_titles_by_language(article_title, langlinks)
    wiki_lang = @wiki.language
    title_by_lang = {}
    LANGUAGE_LINK_TARGETS.each do |lang|
      if lang == wiki_lang
        title_by_lang[lang] = article_title
      elsif langlinks[lang]
        title_by_lang[lang] = langlinks[lang]
      end
    end
    title_by_lang
  end

  def fetch_comparison_stats(title_by_lang)
    result = {}
    semaphore = Mutex.new

    threads = LANGUAGE_LINK_TARGETS.map do |lang|
      Thread.new(lang) do |l|
        foreign_title = title_by_lang[l]
        unless foreign_title
          semaphore.synchronize { result[l] = nil }
          next
        end

        stats = fetch_single_language_stats(l, foreign_title)
        semaphore.synchronize { result[l] = stats }
      end
    end

    threads.each(&:join)
    result
  end

  def fetch_single_language_stats(lang, foreign_title)
    lang_wiki = Wiki.find_or_create_by(language: lang, project: 'wikipedia')
    api = WikiActionApi.new(lang_wiki)

    page_info = api.get_page_info(title: foreign_title)
    return nil unless page_info && !page_info['missing']

    pageid = page_info['pageid']
    revision = api.get_page_revision_at_timestamp(pageid:, timestamp: Date.current)
    article_size = revision ? revision['size'] : 0

    lead_wikitext = if revision
                      api.get_lead_section_wikitext(pageid:,
                                                    revision_id: revision['revid'])
                    end
    lead_section_size = lead_wikitext ? lead_wikitext.bytesize : 0

    talk_title = "Talk:#{foreign_title}"
    talk_info = api.get_page_info(title: talk_title)
    talk_size = 0
    if talk_info && !talk_info['missing']
      talk_rev = api.get_page_revision_at_timestamp(pageid: talk_info['pageid'],
                                                    timestamp: Date.current)
      talk_size = talk_rev ? talk_rev['size'] : 0
    end

    images_count = api.get_images_count(title: foreign_title)
    revisions_count = (api.get_all_revisions(pageid:) || []).length
    number_of_editors = api.get_unique_editors_count(pageid:)
    lang_count = api.get_langlinks_count(title: foreign_title)

    {
      title: foreign_title,
      article_size: article_size || 0,
      lead_section_size:,
      talk_size:,
      images_count:,
      number_of_editors:,
      revisions_count:,
      linguistic_versions_count: lang_count + 1
    }
  rescue StandardError => e
    Rails.logger.error("[article_language_comparison] Error fetching stats for #{lang}: #{e.class} - #{e.message}")
    nil
  end
end
