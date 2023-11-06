# frozen_string_literal: true

class ArticleTokenService
  def self.count_all_tokens(revision_id:, wiki:)
    wiki_who_api = WikiWhoApi.new(wiki:)
    all_tokens = wiki_who_api.get_revision_tokens(revision_id)
    all_tokens.count
  end

  def self.count_all_tokens_within_range(tokens: nil, revision_id: nil, wiki:,
                                         start_revision_id:, end_revision_id:)
    tokens ||= WikiWhoApi.new(wiki:).get_revision_tokens(revision_id)
    return 0 unless tokens
    tokens_within_range(tokens:, start_revision_id:, end_revision_id:).count
  end

  def self.count_attributed_tokens(revision_id:, topic:)
    wiki_who_api = WikiWhoApi.new(wiki: topic.wiki)
    tokens = wiki_who_api.get_revision_tokens(revision_id)
    user_ids = extract_user_ids(tokens:, topic:)
    count_attributed(tokens:, user_ids:)
  end

  def self.count_attributed_tokens_within_range(tokens: nil, revision_id: nil, topic:,
                                                start_revision_id:, end_revision_id:)
    return unless start_revision_id && end_revision_id
    tokens ||= WikiWhoApi.new(wiki: topic.wiki).get_revision_tokens(revision_id)
    return 0 unless tokens

    tokens_within_range = tokens_within_range(tokens:, start_revision_id:, end_revision_id:)
    user_ids = extract_user_ids(tokens: tokens_within_range, topic:)

    count_attributed(tokens: tokens_within_range, user_ids:)
  end

  def self.tokens_within_range(tokens:, start_revision_id:, end_revision_id:)
    tokens.select do |token|
      if start_revision_id == end_revision_id
        token['o_rev_id'] == start_revision_id
      else
        token['o_rev_id'] > start_revision_id && token['o_rev_id'] <= end_revision_id
      end
    end
  end

  def self.extract_user_ids(topic:, tokens:)
    editor_ids = tokens.pluck('editor')
    topic.users.where(wiki_user_id: editor_ids).select('wiki_user_id').pluck(:wiki_user_id)
  end

  def self.count_attributed(tokens:, user_ids:)
    tokens.count do |token|
      user_ids.include?(token['editor']&.to_i)
    end
  end
end
