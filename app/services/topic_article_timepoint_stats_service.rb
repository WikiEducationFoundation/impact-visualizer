# frozen_string_literal: true

class TopicArticleTimepointStatsService
  def initialize(topic_article_timepoint:)
    @topic_article_timepoint = topic_article_timepoint
    @wiki_action_api = WikiActionApi.new
    setup_context
  end

  def setup_context
    @topic = @topic_article_timepoint.topic
    @article_timepoint = @topic_article_timepoint.article_timepoint
    @timestamp = @topic_article_timepoint.timestamp
    @article = @article_timepoint.article
    @previous_timestamp = @topic.timestamp_previous_to(@timestamp)
    @first_timestamp = @topic.first_timestamp
  end

  def previous_article_timepoint
    @previous_article_timepoint ||= ArticleTimepoint.find_by(
      article: @article,
      timestamp: @previous_timestamp
    )
  end

  def previous_topic_article_timepoint
    @previous_topic_article_timepoint ||= TopicArticleTimepoint.find_by_topic_article_and_timestamp(
      topic: @topic,
      article: @article,
      timestamp: @previous_timestamp
    )
  end

  def update_stats_for_topic_article_timepoint
    update_baseline_deltas
    update_attributed_deltas
    update_attributed_creation
  end

  def update_attributed_creation
    # Bail if NOT the first timepoint
    return if previous_article_timepoint

    # See if Article created by a TopicUser
    attributed_creator = @topic.users.find_by wiki_user_id: @article.first_revision_by_id
    attributed_creation_at = @article.first_revision_at if attributed_creator

    @topic_article_timepoint.update(attributed_creator:, attributed_creation_at:)
  end

  def update_baseline_deltas
    length_delta = 0
    revisions_count_delta = 0

    # If this is first timestamp for Topic, leave deltas at 0
    unless @previous_timestamp
      @topic_article_timepoint.update(length_delta:, revisions_count_delta:)
      return
    end

    ## If not first timestamp AND there IS a previous timepoint, calulate the delta

    # Calculate length diff based on previous article_timepoint and current article_timepoint
    if previous_article_timepoint&.article_length&.positive? &&
       @article_timepoint.article_length&.positive?
      length_delta = @article_timepoint.article_length -
                     previous_article_timepoint.article_length
    end

    # Calculate revision diff based on previous article_timepoint and current article_timepoint
    if previous_article_timepoint&.revisions_count&.positive? &&
       @article_timepoint&.revisions_count&.positive?
      revisions_count_delta = @article_timepoint.revisions_count -
                              previous_article_timepoint.revisions_count
    end

    ## If not first timestamp AND there IS NOT a previous timepoint, assume new article to topic...
    # ... and use the full length and revision count as delta values

    if !previous_article_timepoint && @article_timepoint.article_length&.positive?
      length_delta = @article_timepoint.article_length
    end

    # Calculate revision diff based on previous article_timepoint and current article_timepoint
    if !previous_article_timepoint && @article_timepoint&.revisions_count&.positive?
      revisions_count_delta = @article_timepoint.revisions_count
    end

    @topic_article_timepoint.update(length_delta:, revisions_count_delta:)
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
        previous_size = previous_article_timepoint&.article_length || 0
      else
        # Otherwise, grab from previous array element
        previous_size = revisions[index - 1][:size]
      end

      size = revision[:size]
      next unless size && previous_size

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

  def update_token_stats(tokens:)
    # If first timestamp set counts to 0
    unless @previous_timestamp
      @topic_article_timepoint.update attributed_token_count: 0, token_count_delta: 0
      return
    end

    # Setup variables
    topic = @topic

    # If no previous timpoint, use this revision as beginning
    start_revision_id = @topic_article_timepoint.revision_id

    # If there is a previous timepoint, start from there
    if previous_topic_article_timepoint
      start_revision_id = previous_topic_article_timepoint.revision_id
    end

    end_revision_id = @topic_article_timepoint.revision_id

    token_count_delta = 0

    # Count the attributed tokens since since previous revision
    attributed_token_count = ArticleTokenService.count_attributed_tokens_within_range(
      tokens:, topic:, start_revision_id:, end_revision_id:
    )

    # Count the difference in total token_count since previous timestamp
    if @article_timepoint.token_count&.positive? && previous_article_timepoint
      token_count_delta = @article_timepoint.token_count - (previous_article_timepoint.token_count || 0)
    end

    # ... or use full count if this is first
    if @article_timepoint.token_count&.positive? && !previous_article_timepoint
      token_count_delta = @article_timepoint.token_count
    end

    @topic_article_timepoint.update attributed_token_count:, token_count_delta:
  end

  def all_revisions_in_range
    @wiki_action_api.get_all_revisions_in_range(
      pageid: @article.pageid,
      start_timestamp: @previous_timestamp,
      end_timestamp: @timestamp
    )
  end
end
