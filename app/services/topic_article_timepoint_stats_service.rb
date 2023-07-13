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
    @previous_article_timepoint = ArticleTimepoint.find_by(
      article: @article,
      timestamp: @previous_timestamp
    )
  end

  def update_stats_for_topic_article_timepoint
    # Collect calculations
    deltas = calculate_deltas
    attributed_deltas = calculate_attributed_deltas
    attributed_creation = find_attributed_creation

    # Update accordingly
    @topic_article_timepoint.update(
      length_delta: deltas[:length_delta],
      revisions_count_delta: deltas[:revisions_count_delta],
      attributed_length_delta: attributed_deltas[:attributed_length_delta],
      attributed_revisions_count_delta: attributed_deltas[:attributed_revisions_count_delta],
      attributed_creator: attributed_creation[:creator],
      attributed_creation_at: attributed_creation[:creation_at]
    )
  end

  def find_attributed_creation
    # Return nada if this is the first timepoint
    return { creator: nil, creation_at: nil } if @previous_article_timepoint

    # See if Article created by a TopicUser
    creator = @topic.users.find_by wiki_user_id: @article.first_revision_by_id
    creation_at = @article.first_revision_at if creator

    # Return
    return { creator:, creation_at: }
  end

  def calculate_deltas
    length_delta = 0
    revisions_count_delta = 0

    if @previous_article_timepoint
      # Calculate diffs based on previous article_timepoint and current article_timepoint
      length_delta =
        @article_timepoint.article_length - @previous_article_timepoint.article_length
      revisions_count_delta =
        @article_timepoint.revisions_count - @previous_article_timepoint.revisions_count
    end

    return { length_delta:, revisions_count_delta: }
  end

  def calculate_attributed_deltas
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

    return {
      attributed_revisions_count_delta:,
      attributed_length_delta:
    }
  end

  def all_revisions_in_range
    @wiki_action_api.get_all_revisions_in_range(
      pageid: @article.pageid,
      start_timestamp: @previous_timestamp,
      end_timestamp: @timestamp
    )
  end
end
