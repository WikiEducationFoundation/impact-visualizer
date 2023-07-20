# frozen_string_literal: true

class TopicTimepointStatsService
  def update_stats_for_topic_timepoint(topic_timepoint:)
    # Grab all related topic_article_timpoints
    topic_article_timepoints = topic_timepoint.topic_article_timepoints

    # Setup counter variables
    length = 0
    length_delta = 0
    revisions_count = 0
    revisions_count_delta = 0
    articles_count = 0
    attributed_revisions_count_delta = 0
    attributed_length_delta = 0
    attributed_articles_created_delta = 0
    token_count = 0
    token_count_delta = 0
    attributed_token_count = 0
    attributed_token_count_delta = 0
    wp10_predictions = []

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
      attributed_token_count_delta += topic_article_timepoint.attributed_token_count_delta
      attributed_articles_created_delta += 1 if topic_article_timepoint.attributed_creator
      wp10_predictions << article_timepoint.wp10_prediction if article_timepoint.wp10_prediction
      articles_count += 1
    end

    # Find average of wp10_predictions
    average_wp10_prediction = calulate_average_wp10_prediction(wp10_predictions)

    # Capture stats
    topic_timepoint.update(length:, length_delta:, articles_count:,
                           revisions_count:, revisions_count_delta:,
                           attributed_revisions_count_delta:,
                           attributed_length_delta:, attributed_articles_created_delta:,
                           average_wp10_prediction:, token_count:, token_count_delta:,
                           attributed_token_count:, attributed_token_count_delta:)
  end

  def calulate_average_wp10_prediction(wp10_predictions)
    sum = wp10_predictions.sum
    sum.to_f / wp10_predictions.size
  end
end
