# frozen_string_literal: true

class ImportService
  attr_accessor :topic, :wiki_action_api

  def initialize(topic:)
    @topic = topic
    @wiki = topic.wiki
    @wiki_action_api = WikiActionApi.new(@wiki)
  end

  def normalize_csv_content(content)
    lines = content.split("\n")
    normalized_lines = lines.map do |line|
      line = line.strip
      next if line.empty?

      unquoted = if line.start_with?('"') && line.end_with?('"')
                   line[1..-2].gsub('""', '"')
                 else
                   line
                 end

      "\"#{unquoted.gsub('"', '""')}\""
    end
    normalized_lines.compact.join("\n")
  end

  def reset_topic
    @topic.topic_timepoints.each do |topic_timepoint|
      topic_timepoint.topic_article_timepoints.destroy_all
    end

    @topic.topic_timepoints.destroy_all

    @topic.articles.each do |article|
      article.article_timepoints.destroy_all
      article.article_bag_articles.destroy_all
      article.destroy
    end

    @topic.users.destroy_all
    @topic.topic_summaries.destroy_all
    @topic.article_bags.destroy_all
  end

  def import_articles(total: nil, at: nil)
    raise ImpactVisualizerErrors::CsvMissingForImport unless topic.articles_csv.attached?
    csv_content = normalize_csv_content(topic.articles_csv.download.force_encoding('UTF-8'))
    article_titles = CSV.parse(csv_content, headers: false, skip_blanks: true)
    article_bag = @topic.active_article_bag ||
                  ArticleBag.create(topic:, name: "#{topic.slug.titleize} Articles")
    total&.call(article_titles.count)
    count = 0
    @imported_titles_mutex = Mutex.new
    @imported_titles = {}
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
    csv_title = article_title[0]
    page_info = @wiki_action_api.get_page_info(title: URI::DEFAULT_PARSER.unescape(csv_title))
    return unless page_info
    title = page_info['title']

    @imported_titles_mutex.synchronize do
      if @imported_titles.key?(title)
        Rails.logger.warn(
          "DUPLICATE DETECTED: CSV entry '#{csv_title}' resolves to '#{title}', " \
          "which was already imported from CSV entry '#{@imported_titles[title]}'"
        )
      else
        @imported_titles[title] = csv_title
      end
    end

    article = Article.find_or_create_by(title:, wiki: @wiki)
    article.update_details
    ArticleBagArticle.find_or_create_by(article:, article_bag:)
  end

  def import_users(total: nil, at: nil)
    raise ImpactVisualizerErrors::CsvMissingForImport unless topic.users_csv.attached?
    csv_content = normalize_csv_content(topic.users_csv.download.force_encoding('UTF-8'))
    user_names = CSV.parse(csv_content, headers: false, skip_blanks: true)
    total&.call(user_names.count)
    count = 0
    Parallel.each(user_names, in_threads: 10) do |user_name|
      ActiveRecord::Base.connection_pool.with_connection do
        count += 1
        at&.call(count)
        user = User.find_or_create_by(name: user_name[0], wiki: @wiki)
        user.update_name_and_id
        TopicUser.find_or_create_by user:, topic: @topic
        ActiveRecord::Base.connection_pool.release_connection
      end
    end
  end
end
