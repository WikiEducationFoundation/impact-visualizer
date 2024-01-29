# frozen_string_literal: true

require 'rails_helper'

describe LiftWingApi do
  describe 'error handling' do
    let(:wikipedia) { create(:wiki, project: 'wikipedia', language: 'en') }
    let(:subject) { described_class.new(wikipedia).get_revision_quality(641962088) }

    it 'handles 400 error as expected', vcr: true do
      expect do
        described_class.new(wikipedia).get_revision_quality(398357283)
      end.not_to raise_error(Faraday::ClientError)
    end

    it 'handles timeout errors gracefully' do
      allow_any_instance_of(Faraday::Connection).to receive(:send)
        .and_raise(Faraday::TimeoutError)
      expect_any_instance_of(described_class).to receive(:log_error).once
      expect(subject).to eq(nil)
    end
  end

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

    it 'works with auth', vcr: true do
      response = described_class.new(wikipedia).get_revision_quality(641962088)
    end

    it 'fetches json for wikipedia', vcr: true do
      response = described_class.new(wikipedia).get_revision_quality(641962088)
      expect(response).to be_a(Hashugar)
      expect(response['prediction']).to be_a(String)
      expect(response['probability']['B']).to be_a(Numeric)
      expect(response['probability']['C']).to be_a(Numeric)
      expect(response['probability']['FA']).to be_a(Numeric)
      expect(response['probability']['GA']).to be_a(Numeric)
      expect(response['probability']['Start']).to be_a(Numeric)
      expect(response['probability']['Stub']).to be_a(Numeric)
    end

    it 'fetches json for ru wikipedia', vcr: true do
      response = described_class.new(ru_wikipedia).get_revision_quality(1)
      expect(response).to be_a(Hashugar)
      expect(response['probability']['I']).to be_a(Numeric)
      expect(response['prediction']).to be_a(String)
    end

    it 'fetches json for wikidata', vcr: true do
      response = described_class.new(wikidata).get_revision_quality(641962088)
      expect(response).to be_a(Hashugar)
      expect(response['probability']['A']).to be_a(Numeric)
      expect(response['prediction']).to be_a(String)
    end
  end
end
