# frozen_string_literal: true

require 'rails_helper'

describe WikiRestApi do
  describe 'error handling and calls ApiErrorHandling method' do
    let(:subject) { described_class.new.get_page_edits_count(page_title: 'Jupiter') }

    it 'handles mediawiki 503 errors gracefully' do
      allow(Rails.env).to receive(:production?).and_return(true)
      stub_wikipedia_503_error
      expect(subject).to eq({})
    end

    it 'handles timeout errors gracefully' do
      allow_any_instance_of(Faraday::Connection).to receive(:get)
        .and_raise(Faraday::TimeoutError)
      expect_any_instance_of(described_class).to receive(:log_error).once
      expect(subject).to eq({})
    end
  end

  describe '#get_page_edits_count' do
    it 'returns total count of edits', :vcr do
      wiki_api = described_class.new
      data = wiki_api.get_page_edits_count(page_title: 'Jazz')
      expect(data).to be_a(Hash)
      expect(data['count']).to be_a(Integer)
      expect(data['limit']).to be_in([true, false])
    end

    it 'returns total count of edits between revision IDs', :vcr do
      wiki_api = described_class.new
      data = wiki_api.get_page_edits_count(
        page_title: 'Jazz',
        from_rev_id: 1159158915,
        to_rev_id: 1161912094
      )
      expect(data).to be_a(Hash)
      expect(data['count']).to eq(2)
      expect(data['limit']).to eq(false)
    end
  end
end