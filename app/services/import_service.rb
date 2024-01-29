# frozen_string_literal: true

class ImportService
  attr_accessor :topic, :wiki_action_api

  def initialize(topic:)
    @topic = topic
    @wiki_action_api = WikiActionApi.new(@topic.wiki)
  end

  def import_articles(total: nil, at: nil)
    raise ImpactVisualizerErrors::CsvMissingForImport unless topic.articles_csv.attached?
    article_titles = CSV.parse(topic.articles_csv.download, headers: false, skip_blanks: true)
    article_bag = @topic.active_article_bag ||
                  ArticleBag.create(topic:, name: "#{topic.slug.titleize} Articles")
    total&.call(article_titles.count)
    count = 0
    Parallel.each(article_titles, in_threads: 10) do |article_title|
      ActiveRecord::Base.connection_pool.with_connection do
        count += 1
        at&.call(count)
        import_article(article_title:, article_bag:)
        ActiveRecord::Base.connection_pool.release_connection
      end
    end
  end

  def import_article(article_title:, article_bag:)
    page_info = @wiki_action_api.get_page_info(title: CGI.unescape(article_title[0]))
    return unless page_info
    title = page_info['title']
    return unless title
    article = Article.find_or_create_by(title:)
    article.update_details
    ArticleBagArticle.find_or_create_by(article:, article_bag:)
  end

  def import_users(total: nil, at: nil)
    raise ImpactVisualizerErrors::CsvMissingForImport unless topic.users_csv.attached?
    user_names = CSV.parse(topic.users_csv.download, headers: false, skip_blanks: true)
    total&.call(user_names.count)
    count = 0
    Parallel.each(user_names, in_threads: 10) do |user_name|
      ActiveRecord::Base.connection_pool.with_connection do
        count += 1
        at&.call(count)
        user = User.find_or_create_by name: user_name[0]
        user.update_name_and_id(wiki: @topic.wiki)
        TopicUser.find_or_create_by user:, topic: @topic
        ActiveRecord::Base.connection_pool.release_connection
      end
    end
  end
end
