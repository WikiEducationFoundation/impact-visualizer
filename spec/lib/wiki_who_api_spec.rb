# frozen_string_literal: true

require 'rails_helper'

describe WikiWhoApi do
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

    it 'fetches tokens and attributed editor ID for a given revision', vcr: true do
      tokens = subject.get_revision_tokens(revision_id)
      expect(tokens.count).to eq(177)
      expect(tokens.first['str']).to be_a(String)
      expect(tokens.first['editor']).to be_a(String)
    end
  end
end
