# frozen_string_literal: true

class ImpactVisualizerErrors
  class TopicMissingStartDate < StandardError; end
  class TopicMissingEndDate < StandardError; end
  class InvalidTimestampForTopic < StandardError; end
  class ArticleMissingPageid < StandardError; end
  class ArticleMissingPageTitle < StandardError; end
  class ArticleMissingFirstRevisionInfo < StandardError; end
  class ArticleCreatedAfterTimestamp < StandardError; end
  class CsvMissingForImport < StandardError; end
  class TopicEditorMissing < StandardError; end
  class TopicMissing < StandardError; end
  class TopicEditorNotAuthorizedForTopic < StandardError; end
  class TopicNotReadyForTimepointGeneration < StandardError; end
  class LiftWingError < StandardError; end
end
