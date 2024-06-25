# frozen_string_literal: true

class TopicsController < ApiController
  before_action :authenticate_topic_editor!, only: [:create, :update, :destroy, :import_users,
                                                    :import_articles, :generate_timepoints]

  def index
    if current_topic_editor && params[:owned]
      @topics = current_topic_editor.topics
      return
    end

    @topics = Topic.where(display: true)
  end

  def show
    @topic = Topic.find(params[:id])
  end

  def create
    topic_service = TopicService.new(topic_editor: current_topic_editor)
    @topic = topic_service.create_topic(topic_params:)
    render :show
  end

  def update
    topic = current_topic_editor.topics.find(params[:id])
    topic_service = TopicService.new(topic_editor: current_topic_editor, topic:)
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
    topic_service.generate_timepoints
    @topic = topic.reload
    render :show
  end

  protected

  def topic_params
    params.require(:topic).permit(:name, :description, :wiki_id, :chart_time_unit,
                                  :editor_label, :start_date, :end_date,
                                  :slug, :timepoint_day_interval)
  end
end
