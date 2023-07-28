# frozen_string_literal: true

class TopicArticleTimepointStatsService
  def initialize(topic_article_timepoint:)
    @topic_article_timepoint = topic_article_timepoint
    @wiki_action_api = WikiActionApi.new
    @wiki_rest_api = WikiRestApi.new
    setup_context
  end

  def setup_context
    @topic = @topic_article_timepoint.topic
    @article_timepoint = @topic_article_timepoint.article_timepoint
    @timestamp = @topic_article_timepoint.timestamp
    @article = @article_timepoint.article
    @previous_timestamp = @topic.timestamp_previous_to(@timestamp)
    @first_timestamp = @topic.first_timestamp
    @previous_article_timepoint = ArticleTimepoint.find_by(
      article: @article,
      timestamp: @previous_timestamp
    )
    @previous_topic_article_timepoint = TopicArticleTimepoint.find_by_topic_article_and_timestamp(
      topic: @topic,
      article: @article,
      timestamp: @previous_timestamp
    )
    @first_topic_article_timepoint = TopicArticleTimepoint.find_by_topic_article_and_timestamp(
      topic: @topic,
      article: @article,
      timestamp: @previous_timestamp
    )
  end

  def update_stats_for_topic_article_timepoint
    update_baseline_deltas
    update_attributed_deltas
    update_attributed_creation
    update_token_stats
  end

  def update_attributed_creation
    # Bail if NOT the first timepoint
    return if @previous_article_timepoint

    # See if Article created by a TopicUser
    attributed_creator = @topic.users.find_by wiki_user_id: @article.first_revision_by_id
    attributed_creation_at = @article.first_revision_at if attributed_creator

    @topic_article_timepoint.update(attributed_creator:, attributed_creation_at:)
  end

  def update_baseline_deltas
    length_delta = 0
    revisions_count_delta = 0
    token_count_delta = 0

    if @previous_article_timepoint
      # Calculate diffs based on previous article_timepoint and current article_timepoint
      length_delta =
        @article_timepoint.article_length - @previous_article_timepoint.article_length
      revisions_count_delta =
        @article_timepoint.revisions_count - @previous_article_timepoint.revisions_count
      token_count_delta =
        @article_timepoint.token_count - @previous_article_timepoint.token_count
    end

    @topic_article_timepoint.update(length_delta:, token_count_delta:, revisions_count_delta:)
  end

  def update_token_stats
    topic = @topic
    revision_id = @article_timepoint.revision_id

    # Get the count of attributed tokens for the revision
    attributed_token_count = ArticleTokenService.count_attributed_tokens(revision_id:, topic:)

    # Capture initial attributed count if this is the first timepoint
    if @timestamp == @first_timestamp
      @topic_article_timepoint.update(
        initial_attributed_token_count: attributed_token_count,
        attributed_token_count: 0,
        attributed_token_count_delta: 0
      )
      return
    end

    # If we made it here, it's not the first timepoint, so...
    # Subtract the initial_attributed_token_count starting point
    # Because... we only care about activity within Topic's timeframe
    attributed_token_count -= @first_topic_article_timepoint.initial_attributed_token_count

    # Find the delta, with the previous timepoint
    previous_attributed_token_count = @previous_topic_article_timepoint.attributed_token_count
    attributed_token_count_delta = attributed_token_count - previous_attributed_token_count

    @topic_article_timepoint.update attributed_token_count:, attributed_token_count_delta:
  end

  def update_attributed_deltas
    # Initialize counters
    attributed_length_delta = 0
    attributed_revisions_count_delta = 0

    revisions = all_revisions_in_range

    revisions&.each_with_index do |revision, index|
      # For each revision, check to see if revision created by topic_user
      user = @topic.user_with_wiki_id(revision[:userid])

      # Skip if user not found
      next unless user

      # Find the size of previous revision, so we can diff
      if index.zero?
        # If first revision in set, get size of previous revision from previous_article_timepoint
        previous_size = @previous_article_timepoint.article_length
      else
        # Otherwise, grab from previous array element
        previous_size = revisions[index - 1][:size]
      end

      # Calculate the diff
      size_diff = revision[:size] - previous_size

      # Skip if revision has negative size
      next unless size_diff.positive?

      # Update counts if revision created by topic_user
      attributed_length_delta += size_diff

      # Update count of attributed revisions
      attributed_revisions_count_delta += 1
    end

    @topic_article_timepoint.update(attributed_length_delta:, attributed_revisions_count_delta:)
  end

  def all_revisions_in_range
    @wiki_action_api.get_all_revisions_in_range(
      pageid: @article.pageid,
      start_timestamp: @previous_timestamp,
      end_timestamp: @timestamp
    )
  end
end
