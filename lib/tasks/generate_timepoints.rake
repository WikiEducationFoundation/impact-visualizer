# frozen_string_literal: true

require 'csv'

task generate_timepoints: :environment do
  topic_slug = ARGV[1]
  return unless topic_slug
  topic = Topic.find_by(slug: topic_slug)
  TimepointService.new(topic:).build_timepoints
  TopicSummaryService.new(topic:).create_summary
end
