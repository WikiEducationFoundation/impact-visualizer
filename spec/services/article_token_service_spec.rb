# frozen_string_literal: true

require 'rails_helper'

describe ArticleTokenService do
  let!(:topic) { create(:topic) }
  let!(:revision_id) { 1084581512 }

  before do
    create(:topic_user, topic:, user: create(:user, wiki_user_id: 25848390))
    create(:topic_user, topic:, user: create(:user, wiki_user_id: 403283))
  end

  describe '.count_all_tokens' do
    it 'returns a count of all tokens for a revision', :vcr do
      token_count = described_class.count_all_tokens(revision_id:, wiki: topic.wiki)
      expect(token_count).to eq(2099)
    end
  end

  describe '.count_attributed_tokens' do
    it 'returns a count of attributed tokens for a revision', :vcr do
      token_count = described_class.count_attributed_tokens(revision_id:, topic:)
      expect(token_count).to eq(136)
    end
  end
end
