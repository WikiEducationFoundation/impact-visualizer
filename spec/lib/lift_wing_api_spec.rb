# frozen_string_literal: true

require 'rails_helper'

describe LiftWingApi do
  context 'when the wiki is not a wikipedia or wikidata' do
    before { stub_wiki_validation }

    let!(:wiki) { create(:wiki, project: 'wikivoyage', language: 'en') }
    let(:subject) { described_class.new(wiki) }

    it 'raises an error' do
      expect { subject }.to raise_error LiftWingApi::InvalidProjectError
    end
  end

  describe '#get_revision_quality' do
    let(:wikipedia) { create(:wiki, project: 'wikipedia', language: 'en') }
    let(:ru_wikipedia) { create(:wiki, project: 'wikipedia', language: 'ru') }
    let(:wikidata) { create(:wiki, project: 'wikidata', language: 'en') }

    it 'fetches json for wikipedia', vcr: true do
      response = described_class.new(wikipedia).get_revision_quality(641962088)
      expect(response).to be_a(Hash)
      expect(response.dig('enwiki', 'scores', '641962088', 'articlequality', 'score'))
        .to be_a(Hash)
    end

    it 'fetches json for ru wikipedia', vcr: true do
      response = described_class.new(ru_wikipedia).get_revision_quality(1)
      expect(response).to be_a(Hash)
      expect(response.dig('ruwiki', 'scores', '1', 'articlequality', 'score'))
        .to be_a(Hash)
    end

    it 'fetches json for wikidata', vcr: true do
      response = described_class.new(wikidata).get_revision_quality(641962088)
      expect(response).to be_a(Hash)
      expect(response.dig('wikidatawiki', 'scores', '641962088', 'itemquality', 'score'))
        .to be_a(Hash)
    end
  end

  describe 'error handling and calls ApiErrorHandling method' do
    let(:rev_ids) { [641962088, 12345] }
    let(:wikipedia) { create(:wiki, project: 'wikipedia', language: 'en') }
    let(:subject) do
      described_class.new(wikipedia).get_revision_quality(rev_ids)
    end

    it 'handles timeout errors' do
      stub_request(:any, %r{https://api.wikimedia.org/.*})
        .to_raise(Errno::ETIMEDOUT)
      expect_any_instance_of(described_class).to receive(:log_error).once
      expect(subject).to be_empty
    end

    it 'handles connection refused errors' do
      stub_request(:any, %r{https://api.wikimedia.org/.*})
        .to_raise(Faraday::ConnectionFailed)
      expect_any_instance_of(described_class).to receive(:log_error).once
      expect(subject).to be_empty
    end
  end
end
