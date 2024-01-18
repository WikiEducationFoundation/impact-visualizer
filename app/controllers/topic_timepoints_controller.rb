# frozen_string_literal: true

class TopicTimepointsController < ApiController
  def index
    @topic = Topic.find(params[:topic_id])
    @topic_timepoints = @topic.topic_timepoints.order('timestamp ASC').all
  end
end
