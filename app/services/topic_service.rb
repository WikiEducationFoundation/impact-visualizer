# frozen_string_literal: true

class TopicService
  attr_accessor :topic_editor, :topic

  def initialize(topic_editor:, topic: nil)
    @topic_editor = topic_editor
    @topic = topic
    if @topic && !@topic_editor.can_edit_topic?(@topic)
      raise ImpactVisualizerErrors::TopicEditorNotAuthorizedForTopic
    end
  end

  def create_topic(topic_params:)
    topic = Topic.create!(topic_params)
    topic_editor.topics << topic
    topic
  end

  def update_topic(topic_params:)
    raise ImpactVisualizerErrors::TopicMissing unless topic
    topic.update(topic_params)
    topic
  end

  def delete_topic
    raise ImpactVisualizerErrors::TopicMissing unless topic
    topic.destroy
  end

  def import_users
    raise ImpactVisualizerErrors::TopicMissing unless topic
    raise ImpactVisualizerErrors::CsvMissingForImport unless topic.users_csv.attached?
    topic.queue_users_import
  end

  def import_articles
    raise ImpactVisualizerErrors::TopicMissing unless topic
    raise ImpactVisualizerErrors::CsvMissingForImport unless topic.articles_csv.attached?
    topic.queue_articles_import
  end

  def generate_timepoints(force_updates: false)
    raise ImpactVisualizerErrors::TopicMissing unless topic
    unless topic.user_count.positive? && topic.articles_count.positive?
      raise ImpactVisualizerErrors::TopicNotReadyForTimepointGeneration
    end
    topic.queue_generate_timepoints(force_updates:)
  end
end
