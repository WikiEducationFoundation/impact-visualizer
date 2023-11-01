# frozen_string_literal: true

task debug_deltas: :environment do
  topic_timepoint = TopicTimepoint.find 29
  topic = topic_timepoint.topic
  good = 0
  bad = 0
  missing_previous_article_timepoint = 0
  missing_article_timepoint = 0

  total_length = 0
  total_delta = 0

  topic_timepoint.topic_article_timepoints.each do |topic_article_timepoint|
    timestamp = topic_article_timepoint.timestamp
    previous_timestamp = topic.timestamp_previous_to(timestamp)
    article_timepoint = topic_article_timepoint.article_timepoint
    article = article_timepoint.article
    previous_article_timepoint = ArticleTimepoint.find_by(
      article: article,
      timestamp: previous_timestamp
    )
    total_length += article_timepoint.article_length
    if previous_article_timepoint && article_timepoint
      expected = article_timepoint.article_length - previous_article_timepoint.article_length
      actual = topic_article_timepoint.length_delta
      total_delta += actual
      good += 1 if expected == actual
    else
      missing_previous_article_timepoint += 1 unless previous_article_timepoint
      missing_article_timepoint += 1 unless article_timepoint
      total_delta += article_timepoint.article_length
      bad += 1
    end
  end

  ap "Good: #{good}"
  ap "Bad: #{bad}"
  ap "missing_previous_article_timepoint: #{missing_previous_article_timepoint}"
  ap "missing_article_timepoint: #{missing_article_timepoint}"
  ap "total_length: #{total_length}"
  ap "total_delta: #{total_delta}"
end
