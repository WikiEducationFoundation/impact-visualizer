# frozen_string_literal: true

class TopicsController < ApiController
  def index
    @topics = Topic.where(display: true)
  end

  def show
    @topic = Topic.find(params[:id])
  end
end
