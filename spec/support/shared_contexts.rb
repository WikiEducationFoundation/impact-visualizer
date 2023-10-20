# frozen_string_literal: true

RSpec.shared_context 'topic with two timepoints' do
  # Topic setup
  let!(:timepoint_day_interval) { 7 }
  let!(:start_date) { Date.new(2023, 1, 1) }
  let!(:end_date) { start_date + timepoint_day_interval.days }
  let!(:topic) { create(:topic, start_date:, end_date:, timepoint_day_interval:) }
  let!(:user) { create(:user) }
  let!(:topic_user) { create(:topic_user, user:, topic:) }
  let!(:article_1) { create(:article, pageid: 2364730) }
  let!(:article_2) { create(:article, pageid: 2364730) }
  let!(:article_bag) { create(:article_bag, topic:) }
  let!(:article_bag_article_1) { create(:article_bag_article, article: article_1, article_bag:) }
  let!(:article_bag_article_2) { create(:article_bag_article, article: article_2, article_bag:) }

  # Start timepoints
  let!(:start_topic_timepoint) { create(:topic_timepoint, topic:, timestamp: start_date) }

  let!(:start_article_timepoint_1) do
    create(:article_timepoint, article: article_1, timestamp: start_date,
           article_length: 100, revisions_count: 1, wp10_prediction: 25.0,
           wp10_prediction_category: 'A', token_count: 10, revision_id: 991007374)
  end
  let!(:start_topic_article_timepoint_1) do
    create(:topic_article_timepoint, topic_timepoint: start_topic_timepoint,
           article_timepoint: start_article_timepoint_1, length_delta: 0,
           revisions_count_delta: 0, attributed_length_delta: 0,
           attributed_revisions_count_delta: 0,
           attributed_token_count: 0, token_count_delta: 0,
           attributed_creator: user, attributed_creation_at: start_date)
  end
  let!(:start_article_timepoint_2) do
    create(:article_timepoint, article: article_2, timestamp: start_date,
          article_length: 100, revisions_count: 2, wp10_prediction: 75.0,
          wp10_prediction_category: 'A',
          token_count: 20, revision_id: 991007374)
  end
  let!(:start_topic_article_timepoint_2) do
    create(:topic_article_timepoint, topic_timepoint: start_topic_timepoint,
           article_timepoint: start_article_timepoint_2, length_delta: 0,
           revisions_count_delta: 0, attributed_length_delta: 0,
           attributed_token_count: 0, token_count_delta: 0,
           attributed_revisions_count_delta: 0)
  end

  # End timepoints
  let!(:end_topic_timepoint) { create(:topic_timepoint, topic:, timestamp: end_date) }

  let!(:end_article_timepoint_1) do
    create(:article_timepoint, article: article_1, timestamp: end_date,
           article_length: 200, revisions_count: 3, wp10_prediction: 80,
           wp10_prediction_category: 'B',
           token_count: 30, revision_id: 1084581512)
  end
  let!(:end_topic_article_timepoint_1) do
    create(:topic_article_timepoint, topic_timepoint: end_topic_timepoint,
           article_timepoint: end_article_timepoint_1, length_delta: 100,
           revisions_count_delta: 2, attributed_length_delta: 50,
           attributed_token_count: 20,
           token_count_delta: 30,
           attributed_revisions_count_delta: 1)
  end
  let!(:end_article_timepoint_2) do
    create(:article_timepoint, article: article_2, timestamp: end_date,
           article_length: 200, revisions_count: 4, wp10_prediction: 30,
           wp10_prediction_category: 'B',
           token_count: 40, revision_id: 1084581512)
  end
  let!(:end_topic_article_timepoint_2) do
    create(:topic_article_timepoint, topic_timepoint: end_topic_timepoint,
           article_timepoint: end_article_timepoint_2, length_delta: 100,
           revisions_count_delta: 2, attributed_length_delta: 50,
           attributed_token_count: 20,
           token_count_delta: 30,
           attributed_revisions_count_delta: 1)
  end

  let!(:revisions_response) do
    [
      {
              revid: 991007374,
           parentid:  981339537,
               user:  'Lennart97',
             userid:  14423028,
          timestamp:  '2020-11-27T19:42:20Z',
               size:  8675
      },
      {
              revid:  1027035394,
           parentid:  991007374,
               user:  'Dl2000',
             userid:  917223,
          timestamp:  '2021-06-05T18:24:18Z',
               size:  8705
      },
      {
              revid:  1084581512,
           parentid:  1027035394,
               user:  'The Mighty Forest',
             userid:  42428311,
          timestamp:  '2022-04-25T10:21:46Z',
               size:  8552
      }
    ]
  end
end

RSpec.shared_context 'three topic_timepoints' do
  let!(:start_date) { Date.new(2023, 1, 1) }
  let!(:end_date) { Date.new(2023, 1, 30) }
  let!(:topic) { create(:topic, start_date:, end_date:, timepoint_day_interval: 7) }
  let!(:topic_timepoint_1) do
    create(
      :topic_timepoint,
      topic:,
      articles_count: 10,
      articles_count_delta: 0,
      attributed_articles_created_delta: 0,
      attributed_length_delta: 0,
      attributed_revisions_count_delta: 0,
      attributed_token_count: 0,
      average_wp10_prediction: 10,
      length: 300,
      length_delta: 0,
      revisions_count: 200,
      revisions_count_delta: 0,
      token_count: 100,
      token_count_delta: 0
    )
  end
  let!(:topic_timepoint_2) do
    create(
      :topic_timepoint,
      topic:,
      articles_count: 20,
      articles_count_delta: 10,
      attributed_articles_created_delta: 5,
      attributed_length_delta: 100,
      attributed_revisions_count_delta: 5,
      attributed_token_count: 4,
      average_wp10_prediction: 20,
      length: 600,
      length_delta: 300,
      revisions_count: 210,
      revisions_count_delta: 10,
      token_count: 200,
      token_count_delta: 100
    )
  end
  let!(:topic_timepoint_3) do
    create(
      :topic_timepoint,
      topic:,
      articles_count: 30,
      articles_count_delta: 10,
      attributed_articles_created_delta: 5,
      attributed_length_delta: 100,
      attributed_revisions_count_delta: 5,
      attributed_token_count: 6,
      average_wp10_prediction: 30,
      length: 900,
      length_delta: 300,
      revisions_count: 220,
      revisions_count_delta: 10,
      token_count: 300,
      token_count_delta: 100
    )
  end
end
