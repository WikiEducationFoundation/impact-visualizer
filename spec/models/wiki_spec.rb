# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Wiki do
  it { is_expected.to have_many(:topics) }

  describe 'validation' do
    context 'For valid wiki projects' do
      it 'ensures the project and language combination are unique' do
        create(:wiki, language: 'zh', project: 'wiktionary')
        expect { create(:wiki, language: 'zh', project: 'wiktionary') }
          .to raise_error(ActiveRecord::RecordInvalid)
      end
    end

    context 'For invalid wiki projects' do
      let(:bad_language) { create(:wiki, language: 'xx', project: 'wikipedia') }
      let(:bad_project) { create(:wiki, language: 'en', project: 'wikinothing') }
      let(:nil_language) { create(:wiki, language: nil, project: 'wikipedia') }

      it 'does not allow bad language codes' do
        expect { bad_language }.to raise_error(ActiveRecord::RecordInvalid)
      end

      it 'does not allow bad projects' do
        expect { bad_project }.to raise_error(ActiveRecord::RecordInvalid)
      end

      it 'does not allow nil language for standard projects' do
        expect { nil_language }.to raise_error(ActiveRecord::RecordInvalid)
      end
    end
  end

  describe '.default_wiki' do
    it 'creates a default wiki' do
      expect(described_class.count).to eq(0)
      wiki = described_class.default_wiki
      expect(described_class.count).to eq(1)
      expect(wiki.language).to eq('en')
      expect(wiki.project).to eq('wikipedia')
    end

    it 'returns existing default wiki' do
      described_class.create language: 'en', project: 'wikipedia'
      wiki = described_class.default_wiki
      expect(described_class.count).to eq(1)
      expect(wiki.language).to eq('en')
      expect(wiki.project).to eq('wikipedia')
    end
  end

  describe '#base_url' do
    it 'returns the correct url for standard projects' do
      wiki = described_class.find_or_create_by(language: 'en', project: 'wikipedia')
      expect(wiki.base_url).to eq('https://en.wikipedia.org')
    end
  end

  describe '#action_api_url' do
    it 'returns the correct url for standard projects' do
      wiki = described_class.find_or_create_by(language: 'en', project: 'wikipedia')
      expect(wiki.action_api_url).to eq('https://en.wikipedia.org/w/api.php')
    end
  end

  describe '#rest_api_url' do
    it 'returns the correct url for standard projects' do
      wiki = described_class.find_or_create_by(language: 'en', project: 'wikipedia')
      expect(wiki.rest_api_url).to eq('https://en.wikipedia.org/w/rest.php/v1/')
    end
  end
end

# == Schema Information
#
# Table name: wikis
#
#  id         :integer          not null, primary key
#  language   :string(16)
#  project    :string(16)
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
# Indexes
#
#  index_wikis_on_language_and_project  (language,project) UNIQUE
#
