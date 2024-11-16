# frozen_string_literal: true

require 'rails_helper'

describe ClassificationsController do
  let!(:topic_editor) do
    create(:topic_editor)
  end
  let!(:classifications) do
    create_list(:biography, 4)
  end

  describe '#index' do
    context 'with topic_editor' do
      it 'returns all Classifications' do
        sign_in topic_editor
        get '/api/classifications'
        body = response.parsed_body
        expect(response.status).to eq(200)
        expect(body['classifications'].count).to eq(4)
      end
    end
  end
end
