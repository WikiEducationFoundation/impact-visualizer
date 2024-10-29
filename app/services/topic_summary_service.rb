# frozen_string_literal: true

class TopicSummaryService
  attr_accessor :topic

  def initialize(topic:)
    @topic = topic
  end

  def create_summary
    # Grab all related topic_timepoints
    topic_timepoints = @topic.topic_timepoints

    # Setup counter variables
    length_delta = 0
    articles_count_delta = 0
    revisions_count_delta = 0
    attributed_revisions_count_delta = 0
    attributed_length_delta = 0
    attributed_articles_created_delta = 0
    token_count_delta = 0
    attributed_token_count = 0
    wp10_predictions = []
    timepoint_count = 0

    # Iterate and sum up stats
    topic_timepoints.each do |topic_timepoint|
      length_delta += topic_timepoint.length_delta
      articles_count_delta += topic_timepoint.articles_count_delta
      revisions_count_delta += topic_timepoint.revisions_count_delta
      attributed_revisions_count_delta += topic_timepoint.attributed_revisions_count_delta
      attributed_length_delta += topic_timepoint.attributed_length_delta
      token_count_delta += topic_timepoint.token_count_delta
      attributed_token_count += topic_timepoint.attributed_token_count
      attributed_articles_created_delta += topic_timepoint.attributed_articles_created_delta
      wp10_predictions << topic_timepoint.average_wp10_prediction
      timepoint_count += 1
    end

    # Get some stats from most recent topic_timepoint
    most_recent_topic_timepoint = topic_timepoints.last
    length = most_recent_topic_timepoint.length
    revisions_count = most_recent_topic_timepoint.revisions_count
    token_count = most_recent_topic_timepoint.token_count
    articles_count = @topic.articles_count

    # Find average of wp10_predictions
    average_wp10_prediction = OresScoreTransformer.calulate_average_wp10_prediction(
      wp10_predictions
    )

    # Summarize wp10_prediction_categories
    wp10_prediction_categories = topic_timepoints.last.wp10_prediction_categories

    # Summarize Classifications
    classifications = ClassificationService.new(topic: @topic).summarize_topic

    # Capture stats
    TopicSummary.create!(topic: @topic, length:, length_delta:, articles_count:,
                         articles_count_delta:, revisions_count:, revisions_count_delta:,
                         attributed_revisions_count_delta:,
                         attributed_length_delta:, attributed_articles_created_delta:,
                         average_wp10_prediction:, wp10_prediction_categories:,
                         token_count:, token_count_delta:, classifications:,
                         attributed_token_count:, timepoint_count:)
  end
end
