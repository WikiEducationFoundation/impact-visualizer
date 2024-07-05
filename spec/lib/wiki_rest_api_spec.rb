# frozen_string_literal: true

require 'rails_helper'

describe WikiRestApi do
  let!(:wiki) { Wiki.default_wiki }

  describe 'error handling and calls ApiErrorHandling method' do
    let(:subject) { described_class.new(wiki).get_page_edits_count(page_title: 'Jupiter') }

    it 'handles mediawiki 503 errors gracefully' do
      stub_wikipedia_503_error
      expect { subject }.to raise_error(Faraday::ClientError)
    end

    it 'handles mediawiki 429 errors gracefully' do
      stub_wikipedia_429_error
      expect { subject }.to raise_error(Faraday::ClientError)
    end

    it 'handles timeout errors gracefully' do
      allow_any_instance_of(Faraday::Connection).to receive(:get)
        .and_raise(Faraday::TimeoutError)
      expect { subject }.to raise_error(Faraday::ClientError)
    end
  end

  describe '#get_page_edits_count' do
    it 'returns total count of edits', :vcr do
      wiki_api = described_class.new(wiki)
      data = wiki_api.get_page_edits_count(page_title: 'Jazz')
      expect(data).to be_a(Hashugar)
      expect(data['count']).to be_a(Integer)
      expect(data['limit']).to be_in([true, false])
    end

    it 'returns total count of edits, with a title with spaces', :vcr do
      wiki_api = described_class.new(wiki)
      data = wiki_api.get_page_edits_count(page_title: '& Juliet')
      expect(data).to be_a(Hashugar)
      expect(data['count']).to be_a(Integer)
      expect(data['limit']).to be_in([true, false])
    end

    it 'returns total count of edits between revision IDs', :vcr do
      wiki_api = described_class.new(wiki)
      data = wiki_api.get_page_edits_count(
        page_title: 'Jazz',
        from_rev_id: 1159158915,
        to_rev_id: 1161912094
      )
      expect(data).to be_a(Hashugar)
      expect(data['count']).to eq(2)
      expect(data['limit']).to eq(false)
    end
  end
end
