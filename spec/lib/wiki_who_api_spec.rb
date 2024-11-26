# frozen_string_literal: true

require 'rails_helper'

describe WikiWhoApi do
  describe 'error handling' do
    let!(:wiki) { create(:wiki, project: 'wikipedia', language: 'en') }
    let(:subject) { described_class.new(wiki:) }
    let(:revision_id) { 641962088 }

    it 'handles 400 error as expected', vcr: false do
      expect do
        subject.get_revision_tokens(revision_id)
      end.not_to raise_error(Faraday::ClientError)
    end

    it 'handles timeout errors gracefully' do
      allow_any_instance_of(Faraday::Connection).to receive(:get)
        .and_raise(Faraday::TimeoutError)
      expect_any_instance_of(described_class).to receive(:log_error).once
      expect do
        subject.get_revision_tokens(revision_id)
      end.to raise_error(WikiWhoApi::RevisionTokenError, "status: nil / revision_id: #{revision_id}")
    end
  end

  context 'when the wiki is not a valid language' do
    let!(:wiki) { create(:wiki, project: 'wikipedia', language: 'aa') }
    let(:subject) { described_class.new(wiki:) }

    it 'raises an error' do
      expect { subject }.to raise_error WikiWhoApi::InvalidLanguageError
    end
  end

  describe '#get_revision_tokens' do
    let!(:wiki) { create(:wiki, project: 'wikipedia', language: 'en') }
    let(:subject) { described_class.new(wiki:) }
    let(:revision_id) { 641962088 }

    it 'fetches tokens and attributed editor ID for a given revision', vcr: false do
      tokens = subject.get_revision_tokens(revision_id)
      expect(tokens.count).to eq(177)
      expect(tokens.first['str']).to be_a(String)
      expect(tokens.first['editor']).to be_a(String)
    end
  end
end
