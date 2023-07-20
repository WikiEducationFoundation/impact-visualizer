# frozen_string_literal: true

class ArticleTokenService
  def self.count_all_tokens(revision_id:, wiki:)
    wiki_who_api = WikiWhoApi.new(wiki:)
    all_tokens = wiki_who_api.get_revision_tokens(revision_id)
    all_tokens.count
  end

  def self.count_attributed_tokens(revision_id:, topic:)
    wiki_who_api = WikiWhoApi.new(wiki: topic.wiki)
    all_tokens = wiki_who_api.get_revision_tokens(revision_id)
    count = 0
    all_tokens.each do |token|
      user_id = token['editor']&.to_i
      next unless user_id
      next unless topic.users.exists?(wiki_user_id: user_id)
      count += 1
    end
    count
  end
end
