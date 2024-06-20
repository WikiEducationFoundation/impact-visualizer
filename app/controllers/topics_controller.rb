# frozen_string_literal: true

class TopicsController < ApiController
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
end
