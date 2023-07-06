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

    # Iterate and sum up stats
    topic_article_timepoints.each do |topic_article_timepoint|
      article_timepoint = topic_article_timepoint.article_timepoint
      length += article_timepoint.article_length
      length_delta += topic_article_timepoint.length_delta
      revisions_count += article_timepoint.revisions_count
      revisions_count_delta += topic_article_timepoint.revisions_count_delta
      articles_count += 1
    end

    # Capture stats
    topic_timepoint.update(length:, length_delta:, articles_count:,
                           revisions_count:, revisions_count_delta:)
  end
end
