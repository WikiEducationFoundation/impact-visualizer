# frozen_string_literal: true

require 'rails_helper'

describe OresApi do
  context 'when the wiki is not a wikipedia or wikidata' do
    before { stub_wiki_validation }

    let!(:wiki) { create(:wiki, project: 'wikivoyage', language: 'en') }
    let(:subject) { described_class.new(wiki) }

    it 'raises an error' do
      expect { subject }.to raise_error OresApi::InvalidProjectError
    end
  end

  describe '#get_revision_data' do
    let(:rev_ids) { [641962088, 12345] }
    let(:wikipedia) { create(:wiki, project: 'wikipedia', language: 'en') }
    let(:wikidata) { create(:wiki, project: 'wikidata', language: 'en') }

    let(:subject) { described_class.new(wikipedia).get_revision_data(rev_ids) }
    let(:subject2) { described_class.new(wikidata).get_revision_data(rev_ids) }

    let(:first_id) { 641962088 }
    let(:last_id) { first_id + OresApi::REVS_PER_REQUEST - 1 }
    let(:many_rev_ids) { (first_id..last_id).to_a }

    it 'fetches json from ores.wikimedia.org for wikipedia', vcr: true do
      expect(subject).to be_a(Hash)
      expect(subject.dig('enwiki', 'scores', '12345', 'articlequality', 'features')).to be_a(Hash)
      expect(subject.dig('enwiki', 'scores', '641962088')).to be_a(Hash)
    end

    it 'fetches json from ores.wikimedia.org for wikidata', vcr: true do
      expect(subject2).to be_a(Hash)
      expect(subject2.dig('wikidatawiki', 'scores', '12345', 'itemquality', 'features'))
        .to be_a(Hash)
      expect(subject2.dig('wikidatawiki', 'scores', '641962088')).to be_a(Hash)
    end

    it 'handles many revisions per request for wikipedia', vcr: true do
      result = described_class.new(wikipedia).get_revision_data(many_rev_ids)
      expect(result.dig('enwiki', 'scores').count).to eq(OresApi::REVS_PER_REQUEST)
    end

    it 'handles many revisions per request for wikidata', vcr: true do
      result = described_class.new(wikidata).get_revision_data(many_rev_ids)
      expect(result.dig('wikidatawiki', 'scores').count).to eq(OresApi::REVS_PER_REQUEST)
    end
  end

  describe 'error handling and calls ApiErrorHandling method' do
    let(:rev_ids) { [641962088, 12345] }
    let(:wikipedia) { create(:wiki, project: 'wikipedia', language: 'en') }
    let(:subject) do
      described_class.new(wikipedia).get_revision_data(rev_ids)
    end

    it 'handles timeout errors' do
      stub_request(:any, %r{https://ores.wikimedia.org/.*})
        .to_raise(Errno::ETIMEDOUT)
      expect_any_instance_of(described_class).to receive(:log_error).once
      expect(subject).to be_empty
    end

    it 'handles connection refused errors' do
      stub_request(:any, %r{https://ores.wikimedia.org/.*})
        .to_raise(Faraday::ConnectionFailed)
      expect_any_instance_of(described_class).to receive(:log_error).once
      expect(subject).to be_empty
    end
  end
end
