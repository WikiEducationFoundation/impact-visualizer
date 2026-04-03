# frozen_string_literal: true

class TopicsController < ApiController
  before_action :authenticate_topic_editor!, only: [:create, :update, :destroy, :import_users,
                                                    :import_articles, :generate_timepoints,
                                                    :incremental_topic_build, :generate_article_analytics]

  def index
    if current_editor && params[:owned]
      @topics = current_editor.is_a?(AdminUser) ? Topic.all : current_editor.topics
      return
    end

    @topics = Topic.where(display: true)
  end

  def show
    @topic = Topic.find(params[:id])
    @enable_caching = !current_editor&.can_edit_topic?(@topic)
  end

  def create
    topic_service = TopicService.new(topic_editor: @topic_editor, auto_import: true)
    @topic = topic_service.create_topic(topic_params:)
    render :show
  end

  def update
    topic = find_editable_topic
    topic_service = TopicService.new(topic_editor: @topic_editor, topic:, auto_import: true)
    @topic = topic_service.update_topic(topic_params:)
    render :show
  end

  def destroy
    topic = find_editable_topic
    topic_service = TopicService.new(topic_editor: @topic_editor, topic:)
    topic_service.delete_topic
    head :no_content
  end

  def import_users
    topic = find_editable_topic
    topic_service = TopicService.new(topic_editor: @topic_editor, topic:)
    topic_service.import_users
    @topic = topic.reload
    render :show
  end

  def import_articles
    topic = find_editable_topic
    topic_service = TopicService.new(topic_editor: @topic_editor, topic:)
    topic_service.import_articles
    @topic = topic.reload
    render :show
  end

  def generate_timepoints
    topic = find_editable_topic
    topic_service = TopicService.new(topic_editor: @topic_editor, topic:)
    force_updates = ActiveModel::Type::Boolean.new.cast(params[:force_updates]) || false
    topic_service.generate_timepoints(force_updates:)
    @topic = topic.reload
    render :show
  end

  def generate_article_analytics
    topic = find_editable_topic
    topic_service = TopicService.new(topic_editor: @topic_editor, topic:)
    topic_service.generate_article_analytics
    @topic = topic.reload
    render :show
  end

  def topic_article_analytics
    topic = Topic.find(params[:id])
    wiki = topic.wiki
    return render json: { error: 'Wiki not found' }, status: :not_found unless wiki

    article_titles = topic.active_article_bag.articles.pluck(:title)
    return render json: { error: 'No articles found' }, status: :not_found if article_titles.empty?

    if topic.article_analytics_exist?
      render json: topic.article_analytics_data
    else
      render json: {
        status: topic.generate_article_analytics_status,
        percent_complete: topic.generate_article_analytics_percent_complete,
        message: 'Article analytics need to be generated. Please run generate_article_analytics first.'
      }
    end
  end

  LANGUAGE_LINKS_TARGETS = %w[en it fr es de].freeze
  LANGUAGE_LINKS_BATCH_SIZE = 50
  LANGUAGE_LINKS_MAX_CONCURRENT = 3

  def language_links
    topic = Topic.find(params[:id])
    wiki = topic.wiki
    return render json: { error: 'Wiki not found' }, status: :not_found unless wiki

    article_titles = topic.active_article_bag.articles.pluck(:title)
    Rails.logger.info("[language_links] Topic #{topic.id} (#{topic.name}): #{article_titles.size} articles, wiki=#{wiki.language}")
    return render json: {}, status: :ok if article_titles.empty?

    batches = article_titles.each_slice(LANGUAGE_LINKS_BATCH_SIZE).to_a
    wiki_lang = wiki.language
    include_own_lang = LANGUAGE_LINKS_TARGETS.include?(wiki_lang)

    Rails.logger.info("[language_links] Split into #{batches.size} batches of up to #{LANGUAGE_LINKS_BATCH_SIZE}, targets=#{LANGUAGE_LINKS_TARGETS.inspect}")

    result = {}
    semaphore = Mutex.new
    errors = []

    batches.each_slice(LANGUAGE_LINKS_MAX_CONCURRENT) do |concurrent_group|
      threads = concurrent_group.map do |batch|
        Thread.new(batch) do |titles|
          Rails.logger.info("[language_links] Fetching langlinks for batch (#{titles.size} titles): #{titles.first(5).inspect}#{'...' if titles.size > 5}")
          api = WikiActionApi.new(wiki)
          batch_result = api.get_langlinks(titles: titles)
          Rails.logger.info("[language_links] Batch response data: #{batch_result.inspect}")
          batch_result
        end
      end

      threads.each do |t|
        begin
          batch_links = t.value
          next unless batch_links

          semaphore.synchronize do
            batch_links.each do |title, langs|
              filtered = langs.select { |l| LANGUAGE_LINKS_TARGETS.include?(l) }
              filtered << wiki_lang if include_own_lang
              result[title] = filtered.uniq
            end
          end
        rescue MediawikiApi::HttpError => e
          semaphore.synchronize { errors << e }
        rescue StandardError => e
          Rails.logger.error("[language_links] Batch failed: #{e.class} - #{e.message}")
          semaphore.synchronize { errors << e }
        end
      end
    end

    if result.empty? && errors.any?
      status = errors.any? { |e| e.is_a?(MediawikiApi::HttpError) && e.status == 429 } ? :too_many_requests : :bad_gateway
      return render json: { error: 'Failed to fetch language links from Wikipedia. Please try again later.' }, status: status
    end

    article_titles.each do |title|
      next if result.key?(title)
      result[title] = include_own_lang ? [wiki_lang] : []
    end

    Rails.logger.info("[language_links] Final result (#{result.size} articles): #{result.inspect}")
    render json: result
  end

  def incremental_topic_build
    topic = find_editable_topic
    topic_service = TopicService.new(topic_editor: @topic_editor, topic:)
    force_updates = ActiveModel::Type::Boolean.new.cast(params[:force_updates]) || false
    topic_service.incremental_topic_build(force_updates:)
    @topic = topic.reload
    render :show
  end

  protected

  def find_editable_topic
    if @topic_editor.is_a?(AdminUser)
      Topic.find(params[:id])
    else
      @topic_editor.topics.find(params[:id])
    end
  end

  def topic_params
    the_params = params.require(:topic).permit(:name, :description, :wiki_id, :chart_time_unit,
                                               :editor_label, :start_date, :end_date, :users_csv,
                                               :articles_csv, :slug, :timepoint_day_interval,
                                               :convert_tokens_to_words, :tokens_per_word)

    # Working around Axios bug on front-end that leads to a hash instead of array
    unsafe = params[:topic].to_unsafe_h
    if unsafe[:classification_ids].is_a?(Array)
      the_params[:classification_ids] = unsafe[:classification_ids]
    elsif unsafe[:classification_ids].is_a?(Hash)
      the_params[:classification_ids] = unsafe[:classification_ids].values
    end

    the_params
  end
end
