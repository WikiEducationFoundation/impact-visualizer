# frozen_string_literal: true

RSpec.shared_context 'topic with two timepoints' do
  # Topic setup
  let!(:timepoint_day_interval) { 7 }
  let!(:start_date) { Date.new(2023, 1, 1) }
  let!(:end_date) { start_date + timepoint_day_interval.days }
  let!(:topic) { create(:topic, start_date:, end_date:, timepoint_day_interval:) }
  let!(:article_1) { create(:article, pageid: 2364730) }
  let!(:article_2) { create(:article, pageid: 2364730) }
  let!(:article_bag) { create(:article_bag, topic:) }
  let!(:article_bag_article_1) { create(:article_bag_article, article: article_1, article_bag:) }
  let!(:article_bag_article_2) { create(:article_bag_article, article: article_2, article_bag:) }

  # Start timepoints
  let!(:start_topic_timepoint) { create(:topic_timepoint, topic:, timestamp: start_date) }

  let!(:start_article_timepoint_1) do
    create(:article_timepoint, article: article_1, timestamp: start_date,
           article_length: 100, revisions_count: 1)
  end
  let!(:start_topic_article_timepoint_1) do
    create(:topic_article_timepoint, topic_timepoint: start_topic_timepoint,
           article_timepoint: start_article_timepoint_1, length_delta: 0,
           revisions_count_delta: 0)
  end
  let!(:start_article_timepoint_2) do
    create(:article_timepoint, article: article_2, timestamp: start_date,
          article_length: 100, revisions_count: 2)
  end
  let!(:start_topic_article_timepoint_2) do
    create(:topic_article_timepoint, topic_timepoint: start_topic_timepoint,
           article_timepoint: start_article_timepoint_2, length_delta: 0,
           revisions_count_delta: 0)
  end

  # End timepoints
  let!(:end_topic_timepoint) { create(:topic_timepoint, topic:, timestamp: end_date) }

  let!(:end_article_timepoint_1) do
    create(:article_timepoint, article: article_1, timestamp: end_date,
           article_length: 200, revisions_count: 3)
  end
  let!(:end_topic_article_timepoint_1) do
    create(:topic_article_timepoint, topic_timepoint: end_topic_timepoint,
           article_timepoint: end_article_timepoint_1, length_delta: 100,
           revisions_count_delta: 2)
  end
  let!(:end_article_timepoint_2) do
    create(:article_timepoint, article: article_2, timestamp: end_date,
           article_length: 200, revisions_count: 4)
  end
  let!(:end_topic_article_timepoint_2) do
    create(:topic_article_timepoint, topic_timepoint: end_topic_timepoint,
           article_timepoint: end_article_timepoint_2, length_delta: 100,
           revisions_count_delta: 2)
  end
end
