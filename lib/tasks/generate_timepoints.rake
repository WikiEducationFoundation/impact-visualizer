# frozen_string_literal: true

require 'csv'

task generate_timepoints: :environment do
  topic_slug = ARGV[1]
  force_updates = ARGV[2] || false
  return unless topic_slug
  topic = Topic.find_by(slug: topic_slug)
  TimepointService.new(topic:, force_updates:).full_timepoint_build
  TopicSummaryService.new(topic:).create_summary
  topic.touch
  exit!
end
