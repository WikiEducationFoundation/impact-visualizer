# frozen_string_literal: true

require 'rails_helper'

describe WikiWhoApi do
  describe 'error handling' do
    let!(:wiki) { create(:wiki, project: 'wikipedia', language: 'en') }
    let(:subject) { described_class.new(wiki:) }
    let(:revision_id) { 641962088 }
    let(:missing_revision_id) { 853329422 }
    let(:broken_revision_id) { 1255983861 }

    it 'handles 400 error as expected', :vcr do
      expect {
        subject.get_revision_tokens(missing_revision_id)
      }.not_to raise_error(WikiWhoApi::RevisionTokenError)

      expect(subject.get_revision_tokens(missing_revision_id)).to eq(nil)
    end

    it 'handles 408 error as expected', :vcr do
      expect {
        subject.get_revision_tokens(broken_revision_id)
      }.not_to raise_error(WikiWhoApi::RevisionTokenError)

      expect(subject.get_revision_tokens(missing_revision_id)).to eq(nil)
    end

    it 'handles timeout errors gracefully' do
      allow_any_instance_of(Faraday::Connection).to receive(:get)
        .and_raise(Faraday::TimeoutError)
      expect_any_instance_of(described_class).to receive(:log_error).once
      expect {
        subject.get_revision_tokens(revision_id)
      }.to raise_error(WikiWhoApi::RevisionTokenError, "status: nil / revision_id: #{revision_id}")
    end
  end

  context 'when the wiki is not a valid language' do
    let!(:wiki) { create(:wiki, project: 'wikipedia', language: 'aa') }
    let(:subject) { described_class.new(wiki:) }

    it 'raises an error' do
      expect { subject }.to raise_error WikiWhoApi::InvalidLanguageError
    end
  end

  describe 'AVAILABLE_WIKIPEDIAS' do
    it 'includes the languages with empirical tokens_per_word data' do
      # Sanity: the WikiWho language list and the words_per_token study
      # should agree. If a language has data in config/words_per_token.yml
      # but isn't in AVAILABLE_WIKIPEDIAS, the app will refuse to fetch
      # tokens for it even though we have a default ratio.
      Wiki.reset_tokens_per_word_table!
      studied = Wiki.tokens_per_word_table.keys
      missing = studied - described_class::AVAILABLE_WIKIPEDIAS
      expect(missing).to eq([]),
                         "Languages with words_per_token data but not in WikiWhoApi: #{missing.inspect}"
    end

    it 'excludes Norwegian variants which 404 at the WikiWho API' do
      expect(described_class::AVAILABLE_WIKIPEDIAS).not_to include('no')
      expect(described_class::AVAILABLE_WIKIPEDIAS).not_to include('nb')
    end
  end

  describe '#get_revision_tokens' do
    let!(:wiki) { create(:wiki, project: 'wikipedia', language: 'en') }
    let(:subject) { described_class.new(wiki:) }
    let(:revision_id) { 641962088 }

    it 'fetches tokens and attributed editor ID for a given revision', :vcr do
      tokens = subject.get_revision_tokens(revision_id)
      expect(tokens.count).to eq(177)
      expect(tokens.first['str']).to be_a(String)
      expect(tokens.first['editor']).to be_a(String)
    end
  end
end
