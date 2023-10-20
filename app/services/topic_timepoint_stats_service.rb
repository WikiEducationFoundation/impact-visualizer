# frozen_string_literal: true

class TopicTimepointStatsService
  def update_stats_for_topic_timepoint(topic_timepoint:)
    # Grab all related topic_article_timpoints
    topic_article_timepoints = topic_timepoint.topic_article_timepoints

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
    wp10_predictions = []
    wp10_prediction_categories = []

    # Iterate and sum up stats
    topic_article_timepoints.each do |topic_article_timepoint|
      article_timepoint = topic_article_timepoint.article_timepoint
      length += article_timepoint.article_length
      length_delta += topic_article_timepoint.length_delta
      revisions_count += article_timepoint.revisions_count
      token_count += article_timepoint.token_count
      revisions_count_delta += topic_article_timepoint.revisions_count_delta
      attributed_revisions_count_delta += topic_article_timepoint.attributed_revisions_count_delta
      attributed_length_delta += topic_article_timepoint.attributed_length_delta
      token_count_delta += topic_article_timepoint.token_count_delta
      attributed_token_count += topic_article_timepoint.attributed_token_count
      attributed_articles_created_delta += 1 if topic_article_timepoint.attributed_creator
      wp10_predictions << article_timepoint.wp10_prediction if article_timepoint.wp10_prediction
      wp10_prediction_categories << article_timepoint.wp10_prediction_category
      articles_count += 1
    end

    if previous_topic_timepoint
      previous_count = previous_topic_timepoint.topic_article_timepoints.count
      articles_count_delta = articles_count - previous_count
    end

    # Summarize wp10_prediction_categories
    wp10_prediction_categories = wp10_prediction_categories.tally

    # Find average of wp10_predictions
    average_wp10_prediction = OresScoreTransformer.calulate_average_wp10_prediction(
      wp10_predictions
    )

    # Capture stats
    topic_timepoint.update(length:, length_delta:, articles_count:, articles_count_delta:,
                           revisions_count:, revisions_count_delta:,
                           attributed_revisions_count_delta:,
                           attributed_length_delta:, attributed_articles_created_delta:,
                           average_wp10_prediction:, wp10_prediction_categories:,
                           token_count:, token_count_delta:,
                           attributed_token_count:)
  end
end
