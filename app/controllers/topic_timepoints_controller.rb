# frozen_string_literal: true

class TopicTimepointsController < ApiController
  def index
    @topic = Topic.find(params[:topic_id])
    # Only serve timepoints that stage 4 has actually summarized. A
    # topic_timepoint is created in stage 2 (build_timepoints_for_timestamp)
    # with null aggregate fields and only filled in stage 4
    # (update_stats_for_topic_timepoint), so a mid-build or failed-build topic
    # has rows that exist but carry null stats. Serving those hands the chart
    # invalid data (e.g. a null wp10_prediction_categories). An aggregated row
    # always has a non-null wp10_prediction_categories ({} at minimum), so use
    # that as the "summarized" gate — `present?` would wrongly drop the valid
    # empty-hash case.
    summarized = @topic.topic_timepoints.where.not(wp10_prediction_categories: nil)
    @topic_timepoints = @topic.timestamps.map do |timestamp|
      summarized.find_by(timestamp:)
    end
    @topic_timepoints = @topic_timepoints.compact
    @topic_timepoints
  end
end
