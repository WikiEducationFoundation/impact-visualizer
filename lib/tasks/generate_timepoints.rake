# frozen_string_literal: true

require 'csv'

task generate_timepoints: :environment do
  topic = Topic.find_by(name: 'Rana')
  TimepointService.new(topic:).build_timepoints
  TopicSummaryService.new(topic:).create_summary
end
