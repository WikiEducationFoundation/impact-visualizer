# frozen_string_literal: true

class TopicService
  attr_accessor :topic_editor, :topic, :auto_import

  def initialize(topic_editor:, topic: nil, auto_import: false)
    @topic_editor = topic_editor
    @auto_import = auto_import
    @topic = topic
    if @topic && !@topic_editor.can_edit_topic?(@topic)
      raise ImpactVisualizerErrors::TopicEditorNotAuthorizedForTopic
    end
  end

  def create_topic(topic_params:)
    @topic = Topic.create!(topic_params)
    topic_editor.topics << @topic unless topic_editor.is_a?(AdminUser)
    handle_auto_import(topic_params:)
    @topic
  end

  def update_topic(topic_params:)
    raise ImpactVisualizerErrors::TopicMissing unless topic
    topic.update(topic_params)
    handle_auto_import(topic_params:)
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
    unless topic.articles_count.positive?
      raise ImpactVisualizerErrors::TopicNotReadyForTimepointGeneration
    end
    topic.queue_generate_timepoints(force_updates:)
  end

  def generate_article_analytics
    raise ImpactVisualizerErrors::TopicMissing unless topic
    unless topic.articles_count.positive?
      raise ImpactVisualizerErrors::TopicNotReadyForArticleAnalyticsGeneration
    end
    topic.queue_generate_article_analytics
  end

  def incremental_topic_build(force_updates: false)
    raise ImpactVisualizerErrors::TopicMissing unless topic
    unless topic.articles_count.positive?
      raise ImpactVisualizerErrors::TopicNotReadyForTimepointGeneration
    end
    topic.queue_incremental_topic_build(force_updates:)
  end

  def handle_auto_import(topic_params:)
    return unless auto_import
    import_users if topic.users_csv.attached? && topic_params[:users_csv].present?
    import_articles if topic.articles_csv.attached? && topic_params[:articles_csv].present?
  end
end
