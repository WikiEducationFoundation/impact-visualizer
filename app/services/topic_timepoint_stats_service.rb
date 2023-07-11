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

    # Iterate and sum up stats
    topic_article_timepoints.each do |topic_article_timepoint|
      article_timepoint = topic_article_timepoint.article_timepoint
      length += article_timepoint.article_length
      length_delta += topic_article_timepoint.length_delta
      revisions_count += article_timepoint.revisions_count
      revisions_count_delta += topic_article_timepoint.revisions_count_delta
      attributed_revisions_count_delta += topic_article_timepoint.attributed_revisions_count_delta
      attributed_length_delta += topic_article_timepoint.attributed_length_delta
      attributed_articles_created_delta += 1 if topic_article_timepoint.attributed_creator
      articles_count += 1
    end

    # Capture stats
    topic_timepoint.update(length:, length_delta:, articles_count:,
                           revisions_count:, revisions_count_delta:,
                           attributed_revisions_count_delta:,
                           attributed_length_delta:, attributed_articles_created_delta:)
  end
end
