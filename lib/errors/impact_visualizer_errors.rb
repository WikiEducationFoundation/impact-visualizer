# frozen_string_literal: true

class ImpactVisualizerErrors
  class TopicMissingStartDate < StandardError; end
  class ArticleMissingPageid < StandardError; end
  class InvalidTimestampForTopic < StandardError; end
end