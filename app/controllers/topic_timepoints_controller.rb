# frozen_string_literal: true

class TopicTimepointsController < ApiController
  def index
    @topic = Topic.find(params[:topic_id])
    @topic_timepoints = @topic.timestamps.map do |timestamp|
      @topic.topic_timepoints.find_by(timestamp:)
    end
    @topic_timepoints = @topic_timepoints.compact
    @topic_timepoints
  end
end
