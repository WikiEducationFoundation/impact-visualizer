# frozen_string_literal: true

require 'csv'

task import_topic: :environment do
  wiki = Wiki.default_wiki

  topic_slug = ARGV[1]
  topic = Topic.find_by slug: topic_slug

  return unless topic

  article_bag = ArticleBag.find_or_create_by topic:, name: "#{topic_slug.titleize} Articles"

  articles_csv_file = "topic-articles-#{topic_slug}.csv"
  users_csv_file = "topic-users-#{topic_slug}.csv"
  article_titles = CSV.read("db/csv/#{articles_csv_file}", headers: false)
  user_names = CSV.read("db/csv/#{users_csv_file}", headers: false)

  wiki_action_api = WikiActionApi.new
  count = 0

  Parallel.each(article_titles, in_threads: 10) do |article_title|
    ActiveRecord::Base.connection_pool.with_connection do
      count += 1
      ap "Creating Article #{count}/#{article_titles.count}"
      page_info = wiki_action_api.get_page_info(title: CGI.unescape(article_title[0]))
      next unless page_info
      title = page_info['title']
      next unless title
      article = Article.find_or_create_by(title:)
      article.update_details
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
