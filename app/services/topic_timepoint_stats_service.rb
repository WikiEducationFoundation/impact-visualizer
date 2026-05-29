# frozen_string_literal: true

class TopicTimepointStatsService
  def update_stats_for_topic_timepoint(topic_timepoint:)
    # Get previous
    topic = topic_timepoint.topic
    timestamp = topic_timepoint.timestamp
    previous_timestamp = topic.timestamp_previous_to(timestamp)
    previous_topic_timepoint = topic.topic_timepoints.find_by(timestamp: previous_timestamp)

    # Setup counter variables
    length = 0
    length_delta = 0
    revisions_count = 0
    revisions_count_delta = 0
    articles_count = 0
    articles_count_delta = 0
    attributed_revisions_count_delta = 0
    attributed_length_delta = 0
    attributed_articles_created_delta = 0
    token_count = 0
    token_count_delta = 0
    attributed_token_count = 0
    # Stream the wp10 stats rather than collecting per-article arrays: a
    # running sum + count for the average, and a running tally for the
    # category breakdown (equivalent to `compact.tally`).
    wp10_prediction_sum = 0.0
    wp10_prediction_count = 0
    wp10_prediction_categories = Hash.new(0)

    # Get/prep categorization summary
    classification_service = ClassificationService.new(topic:)
    classifications = classification_service.summarize_topic_timepoint(
      topic_timepoint:,
      previous_topic_timepoint:
    )

    # Sum stats in batches. Materializing every topic_article_timepoint (and
    # its eager-loaded article_timepoint) at once was ~2 AR objects per
    # article — hundreds of MB on a 160k-article topic — held for the whole
    # aggregation. find_each keeps only one batch resident at a time, so the
    # footprint is flat regardless of article count; includes(:article_timepoint)
    # still preloads per batch to avoid the N+1 dereference inside the loop.
    topic_timepoint.topic_article_timepoints.includes(:article_timepoint).find_each do |tat|
      article_timepoint = tat.article_timepoint
      length += article_timepoint.article_length || 0
      length_delta += tat.length_delta || 0
      revisions_count += article_timepoint.revisions_count || 0
      revisions_count_delta += tat.revisions_count_delta || 0
      attributed_revisions_count_delta += tat.attributed_revisions_count_delta || 0
      attributed_length_delta += tat.attributed_length_delta || 0
      # Truthiness-only check; read the FK column directly instead of
      # loading the User association, which was a second N+1 next to
      # the article_timepoint one.
      attributed_articles_created_delta += 1 if tat.attributed_creator_id
      if article_timepoint.wp10_prediction
        wp10_prediction_sum += article_timepoint.wp10_prediction
        wp10_prediction_count += 1
      end
      category = article_timepoint.wp10_prediction_category
      wp10_prediction_categories[category] += 1 if category
      token_count += article_timepoint.token_count || 0
      token_count_delta += tat.token_count_delta || 0
      attributed_token_count += tat.attributed_token_count || 0
      articles_count += 1
    end

    if previous_topic_timepoint
      previous_count = previous_topic_timepoint.topic_article_timepoints.count
      articles_count_delta = articles_count - previous_count
    end

    # Average wp10 prediction over the articles that had one. Matches
    # OresScoreTransformer.calulate_average_wp10_prediction (sum / count),
    # including its NaN when there were no predictions.
    average_wp10_prediction = wp10_prediction_sum / wp10_prediction_count

    # Capture stats
    topic_timepoint.update!(length:, length_delta:, articles_count:, articles_count_delta:,
                            revisions_count:, revisions_count_delta:,
                            attributed_revisions_count_delta:,
                            attributed_length_delta:, attributed_articles_created_delta:,
                            average_wp10_prediction:, wp10_prediction_categories:,
                            token_count:, token_count_delta:, classifications:,
                            attributed_token_count:)
  end
end
