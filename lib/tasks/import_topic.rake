# frozen_string_literal: true

require 'csv'

# TOPIC = 'diptera'
TOPIC = 'rana'

task import_topic: :environment do
  wiki = Wiki.default_wiki

  topic = Topic.find_or_create_by(
    name: TOPIC.titleize,
    slug: TOPIC,
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    wiki:,
    start_date: Date.new(2022, 9, 1),
    end_date: Date.new(2023, 1, 1),
    timepoint_day_interval: 7
  )

  article_bag = ArticleBag.find_or_create_by topic:, name: "#{TOPIC.titleize} Articles"

  return unless topic

  articles_csv_file = "topic-articles-#{TOPIC}.csv"
  users_csv_file = "topic-users-#{TOPIC}.csv"
  article_titles = CSV.read("spec/fixtures/#{articles_csv_file}", headers: false)
  user_names = CSV.read("spec/fixtures/#{users_csv_file}", headers: false)

  wiki_action_api = WikiActionApi.new
  count = 0

  Parallel.each(article_titles, in_threads: 10) do |article_title|
    ActiveRecord::Base.connection_pool.with_connection do
      count += 1
      ap count
      page_info = wiki_action_api.get_page_info(title: article_title[0])
      title = page_info['title']
      next unless title
      article = Article.find_or_create_by(title:)
      ArticleBagArticle.find_or_create_by(article:, article_bag:)
      ActiveRecord::Base.connection_pool.release_connection
    end
  end

  user_names.each_with_index do |user_name, index|
    ap "Creating User #{index + 1}/#{user_names.count}"
    user = User.find_or_create_by name: user_name[0]
    user.update_name_and_id(wiki:)
    TopicUser.find_or_create_by user:, topic:
  end

  ap "Topic article count: #{topic.articles.count}"
  ap "Topic user count: #{topic.users.count}"
end
