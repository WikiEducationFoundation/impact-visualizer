# frozen_string_literal: true

require 'rails_helper'

describe WikiActionApi do
  describe 'error handling and calls ApiErrorHandling method' do
    let(:subject) { described_class.new.get_page_info(pageid: 58170849) }

    it 'handles mediawiki 503 errors gracefully' do
      allow(Rails.env).to receive(:production?).and_return(true)
      stub_wikipedia_503_error
      expect(subject).to eq(nil)
    end

    it 'handles mediawiki 429 errors gracefully' do
      allow(Rails.env).to receive(:production?).and_return(true)
      stub_wikipedia_429_error
      expect(subject).to eq(nil)
    end

    it 'handles timeout errors gracefully' do
      allow_any_instance_of(MediawikiApi::Client).to receive(:send)
        .and_raise(Faraday::TimeoutError)
      expect_any_instance_of(described_class).to receive(:log_error).once
      expect(subject).to eq(nil)
    end

    it 'handles API errors gracefully' do
      allow_any_instance_of(MediawikiApi::Client).to receive(:send)
        .and_raise(MediawikiApi::ApiError)
      expect_any_instance_of(described_class).to receive(:log_error).once
      expect(subject).to eq(nil)
    end

    it 'handles HTTP errors gracefully' do
      allow_any_instance_of(MediawikiApi::Client).to receive(:send)
        .and_raise(MediawikiApi::HttpError, '')
      expect_any_instance_of(described_class).to receive(:log_error).once
      expect(subject).to eq(nil)
    end
  end

  describe '#query' do
    it 'executes a generic Wiki API query request', vcr: true do
      wiki_api = described_class.new

      query_parameters = {
        prop: 'revisions',
        titles: ['Guitar'],
        rvprop: %w[size user userid timestamp],
        rvlimit: 3,
        formatversion: '2'
      }

      response = wiki_api.query(query_parameters:)
      expect(response).to be_a(MediawikiApi::Response)
      expect(response.data).to be_a(Hash)
      expect(response['continue']).to be_a(Hash)
      expect(response.data['pages'].length).to eq(1)

      page = response.data['pages'][0]
      expect(page['title']).to eq('Guitar')
      expect(page['revisions'].length).to eq(3)

      revision = page['revisions'][0]
      expect(revision['user']).to be_a(String)
      expect(revision['userid']).to be_a(Integer)
      expect(revision['timestamp']).to be_a(String)
      expect(revision['size']).to be_a(Integer)
    end
  end

  describe '#get_page_info' do
    it 'returns page info given pageid' do
      wiki_api = described_class.new
      data = wiki_api.get_page_info(pageid: 58170849)
      expect(data).to be_a(Hash)
      expect(data['pageid']).to eq(58170849)
      expect(data['title']).to eq('Battle of Bourgthéroulde')
      expect(data['lastrevid']).to be_a(Integer)
      expect(data['length']).to be_a(Integer)
    end

    it 'returns page info given title' do
      wiki_api = described_class.new
      data = wiki_api.get_page_info(title: 'Battle of Bourgthéroulde')
      expect(data).to be_a(Hash)
      expect(data['pageid']).to eq(58170849)
      expect(data['title']).to eq('Battle of Bourgthéroulde')
      expect(data['lastrevid']).to be_a(Integer)
      expect(data['length']).to be_a(Integer)
    end
  end

  describe '#get_user_info' do
    it 'returns user info given userid', :vcr do
      wiki_api = described_class.new
      data = wiki_api.get_user_info(userid: 25848390)
      expect(data).to be_a(Hash)
      expect(data['userid']).to eq(25848390)
      expect(data['name']).to eq('TiltuM')
    end

    it 'returns user info given name', :vcr do
      wiki_api = described_class.new
      data = wiki_api.get_user_info(name: 'TiltuM')
      expect(data).to be_a(Hash)
      expect(data['userid']).to eq(25848390)
      expect(data['name']).to eq('TiltuM')
    end
  end

  describe '#fetch_all' do
    it 'returns the same data as a single complete query would', vcr: true do
      wiki_api = described_class.new

      # With a low palimit, this query will need to continue
      continue_query = { titles: %w[Apple Fruit Ecosystem Pear],
                         prop: 'pageassessments',
                         redirects: 'true',
                         palimit: 2 }

      # With a high palimit, this query will not need to continue
      complete_query = continue_query.merge(palimit: 50)

      complete = wiki_api.fetch_all query_parameters: complete_query
      continue = wiki_api.fetch_all query_parameters: continue_query

      expect(complete).to eq(continue)
    end
  end

  describe '#get_first_revision' do
    it 'gets the first revision', :vcr do
      wiki_api = described_class.new
      revision = wiki_api.get_first_revision(pageid: 58170849)
      expect(revision['user']).to eq('AngevinKnight1154')
      expect(revision['revid']).to eq(855254384)
      expect(revision['size']).to eq(7824)
    end
  end

  describe '#get_revision_at_timestamp' do
    it 'returns the most recent revision at the given timestamp', vcr: true do
      wiki_api = described_class.new
      timestamp = Date.new(2023, 1, 1)
      revision = wiki_api.get_revision_at_timestamp(pageid: 58170849, timestamp:)
      expect(revision['user']).to eq('The Mighty Forest')
      expect(revision['revid']).to eq(1084581512)
      expect(revision['size']).to eq(8552)
    end
  end

  describe '#get_all_revisions' do
    it 'fetches all revisions for a given article', vcr: true do
      wiki_api = described_class.new
      revisions = wiki_api.get_all_revisions(pageid: 58170849)
      expect(revisions.count).to be > 0
      expect(revisions[0]['user']).to be_a(String)
      expect(revisions[0]['userid']).to be_a(Integer)
      expect(revisions[0]['timestamp']).to be_a(String)
      expect(revisions[0]['size']).to be_a(Integer)
    end
  end

  describe '#get_all_revisions_in_range' do
    it 'fetches all revisions in range for a given article', vcr: true do
      start_timestamp = Date.new(2020, 1, 1)
      end_timestamp = Date.new(2023, 1, 1)
      wiki_api = described_class.new
      revisions = wiki_api.get_all_revisions_in_range(
        pageid: 58170849,
        start_timestamp:,
        end_timestamp:
      )
      expect(revisions.count).to be > 0
      expect(revisions[0]['user']).to be_a(String)
      expect(revisions[0]['userid']).to be_a(Integer)
      expect(revisions[0]['timestamp']).to be_a(String)
      expect(revisions[0]['size']).to be_a(Integer)
    end
  end
end
