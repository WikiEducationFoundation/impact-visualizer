# frozen_string_literal: true

class TopicsController < ApiController
  before_action :authenticate_topic_editor!, only: [:create, :update, :destroy, :import_users,
                                                    :import_articles, :generate_timepoints,
                                                    :incremental_topic_build]

  def index
    if current_topic_editor && params[:owned]
      @topics = current_topic_editor.topics
      return
    end

    @topics = Topic.where(display: true)
  end

  def show
    @topic = Topic.find(params[:id])
    @enable_caching = !current_topic_editor&.can_edit_topic?(@topic)
  end

  def create
    topic_service = TopicService.new(topic_editor: current_topic_editor, auto_import: true)
    @topic = topic_service.create_topic(topic_params:)
    render :show
  end

  def update
    topic = current_topic_editor.topics.find(params[:id])
    topic_service = TopicService.new(topic_editor: current_topic_editor, topic:, auto_import: true)
    @topic = topic_service.update_topic(topic_params:)
    render :show
  end

  def destroy
    topic = current_topic_editor.topics.find(params[:id])
    topic_service = TopicService.new(topic_editor: current_topic_editor, topic:)
    topic_service.delete_topic
    head :no_content
  end

  def import_users
    topic = current_topic_editor.topics.find(params[:id])
    topic_service = TopicService.new(topic_editor: current_topic_editor, topic:)
    topic_service.import_users
    @topic = topic.reload
    render :show
  end

  def import_articles
    topic = current_topic_editor.topics.find(params[:id])
    topic_service = TopicService.new(topic_editor: current_topic_editor, topic:)
    topic_service.import_articles
    @topic = topic.reload
    render :show
  end

  def generate_timepoints
    topic = current_topic_editor.topics.find(params[:id])
    topic_service = TopicService.new(topic_editor: current_topic_editor, topic:)
    force_updates = ActiveModel::Type::Boolean.new.cast(params[:force_updates]) || false
    topic_service.generate_timepoints(force_updates:)
    @topic = topic.reload
    render :show
  end

  def incremental_topic_build
    topic = current_topic_editor.topics.find(params[:id])
    topic_service = TopicService.new(topic_editor: current_topic_editor, topic:)
    force_updates = ActiveModel::Type::Boolean.new.cast(params[:force_updates]) || false
    topic_service.incremental_topic_build(force_updates:)
    @topic = topic.reload
    render :show
  end

  protected

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
