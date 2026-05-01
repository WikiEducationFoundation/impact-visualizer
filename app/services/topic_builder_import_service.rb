# frozen_string_literal: true

# Creates a Topic, ArticleBag, and ArticleBagArticles from a Topic Builder
# package payload (already fetched + schema-validated). Atomic per-topic
# transaction; surfaces a structured error so the controller can render an
# actionable message.
class TopicBuilderImportService
  class Error < StandardError; end
  class UnknownWikiError < Error
    attr_reader :language
    def initialize(language)
      @language = language
      super("Impact Visualizer is not configured for the '#{language}' wiki.")
    end
  end
  class ValidationError < Error
    attr_reader :record
    def initialize(record)
      @record = record
      super(record.errors.full_messages.join('; '))
    end
  end

  attr_reader :package, :handle, :topic_editor

  # topic_editor: the editor or admin to associate with the new topic (so
  # non-admin owners can manage their own topics later, when v1's
  # admin-only POST gate is broadened).
  def initialize(package:, topic_editor: nil)
    @package = package
    @handle = package['handle']
    @topic_editor = topic_editor
  end

  def import!
    config = package.fetch('config')
    wiki = resolve_wiki!(config['wiki'])

    Topic.transaction do
      topic = Topic.create!(
        name: config['name'],
        slug: config['slug'],
        description: config['description'],
        editor_label: config['editor_label'],
        start_date: config['start_date'],
        end_date: config['end_date'],
        timepoint_day_interval: config['timepoint_day_interval'],
        wiki: wiki,
        display: false,
        tb_handle: handle
      )

      ArticleBag.create!(topic: topic, name: "#{topic.slug.titleize} Articles")

      if topic_editor && !topic_editor.is_a?(AdminUser)
        topic_editor.topics << topic
      end

      topic
    end
  rescue ActiveRecord::RecordInvalid => e
    raise ValidationError.new(e.record)
  end

  private

  def resolve_wiki!(language)
    wiki = Wiki.find_by(language: language, project: 'wikipedia')
    raise UnknownWikiError.new(language) unless wiki
    wiki
  end
end
