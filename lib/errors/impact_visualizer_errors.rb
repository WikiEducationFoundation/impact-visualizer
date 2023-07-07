# frozen_string_literal: true

class ImpactVisualizerErrors
  class TopicMissingStartDate < StandardError; end
  class InvalidTimestampForTopic < StandardError; end
  class ArticleMissingPageid < StandardError; end
  class ArticleMissingPageTitle < StandardError; end
  class ArticleMissingFirstRevisionInfo < StandardError; end
  class ArticleCreatedAfterTimestamp < StandardError; end
end
