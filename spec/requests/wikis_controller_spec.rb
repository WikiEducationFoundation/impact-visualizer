# frozen_string_literal: true

require 'rails_helper'

describe WikisController do
  describe '#index' do
    let!(:topic_editor) { create(:topic_editor) }
    let!(:en_wiki) { create(:wiki, language: 'en', project: 'wikipedia') }
    let!(:fr_wiki) { create(:wiki, language: 'fr', project: 'wikipedia') }
    let!(:de_wiki) { create(:wiki, language: 'de', project: 'wikipedia') }

    it 'returns all Wiki options' do
      sign_in topic_editor
      get '/api/wikis'
      body = response.parsed_body
      expect(response.status).to eq(200)
      expect(body['wikis'].count).to eq(3)
      wiki = Wiki.find(body['wikis'][0]['id'])
      expect(body['wikis'][0]['language']).to eq(wiki.language)
      expect(body['wikis'][0]['project']).to eq(wiki.project)
    end
  end
end
