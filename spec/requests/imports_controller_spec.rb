# frozen_string_literal: true

require 'rails_helper'

describe ImportsController do
  let!(:wiki) { Wiki.find_or_create_by!(language: 'en', project: 'wikipedia') }
  let(:handle) { 'tbp_abc123' }
  let(:url) { "https://topic-builder.wikiedu.org/packages/#{handle}" }
  let(:package) do
    {
      'handle' => handle,
      'schema_version' => 1,
      'config' => {
        'name' => 'Educational Psychology',
        'slug' => 'educational-psychology',
        'description' => 'A topic.',
        'editor_label' => 'students',
        'start_date' => '2026-01-15',
        'end_date' => '2026-05-30',
        'timepoint_day_interval' => 30,
        'wiki' => 'en'
      },
      'articles' => [
        { 'title' => 'Achievement gap', 'centrality' => 8 },
        { 'title' => 'Active learning', 'centrality' => nil }
      ],
      'article_count' => 2,
      'source_topic' => 'educational psychology'
    }
  end
  let!(:admin) { create(:admin_user, email: 'admin@example.com', password: 'password123') }

  describe 'GET /imports/:handle' do
    context 'when not signed in' do
      it 'redirects to admin sign-in' do
        get "/imports/#{handle}"
        expect(response).to redirect_to(new_admin_user_session_path)
      end
    end

    context 'when signed in as admin' do
      before { sign_in admin }

      it 'renders the preview on a valid 200 from TB' do
        stub_request(:get, url).to_return(
          status: 200, body: package.to_json,
          headers: { 'Content-Type' => 'application/json' }
        )
        get "/imports/#{handle}"
        expect(response.status).to eq(200)
        expect(response.body).to include('Educational Psychology')
        expect(response.body).to include('Achievement gap')
        expect(response.body).to include('Import topic')
      end

      it 'renders the not-found page when TB returns 404' do
        stub_request(:get, url).to_return(status: 404, body: '{"error":"not found"}')
        get "/imports/#{handle}"
        expect(response.status).to eq(404)
        expect(response.body).to include('Handoff not found')
      end

      it 'renders the schema-mismatch page on unknown schema_version' do
        stub_request(:get, url).to_return(
          status: 200, body: package.merge('schema_version' => 2).to_json
        )
        get "/imports/#{handle}"
        expect(response.status).to eq(422)
        expect(response.body).to include('Schema version mismatch')
      end

      it 'renders the network-error page on TB 5xx after retry' do
        stub_request(:get, url).to_return(status: 503, body: '').times(2)
        get "/imports/#{handle}"
        expect(response.status).to eq(502)
        expect(response.body).to include("Couldn't reach Topic Builder")
      end
    end
  end

  describe 'POST /imports/:handle' do
    context 'when not signed in' do
      it 'redirects to admin sign-in' do
        post "/imports/#{handle}"
        expect(response).to redirect_to(new_admin_user_session_path)
      end
    end

    context 'when signed in as admin' do
      before { sign_in admin }

      it 'creates the topic, enqueues the article-ingestion job, and redirects by id' do
        stub_request(:get, url).to_return(
          status: 200, body: package.to_json,
          headers: { 'Content-Type' => 'application/json' }
        )

        expect {
          post "/imports/#{handle}"
        }.to change(Topic, :count).by(1)
          .and change(ImportTopicBuilderArticlesJob.jobs, :size).by(1)

        topic = Topic.last
        expect(topic.tb_handle).to eq(handle)
        expect(topic.article_import_job_id).to be_present
        expect(topic.articles).to be_empty # ingestion is async
        expect(response).to redirect_to("/topics/#{topic.id}")

        enqueued = ImportTopicBuilderArticlesJob.jobs.last
        expect(enqueued['args']).to eq([topic.id, handle])
      end

      it 'shows the unknown-wiki error if IV has no row for the language' do
        package['config']['wiki'] = 'klingon'
        stub_request(:get, url).to_return(status: 200, body: package.to_json)
        post "/imports/#{handle}"
        expect(response.status).to eq(422)
        expect(response.body).to include('Import failed')
        expect(response.body).to include('klingon')
      end

      it 'returns 404 when the package is not found' do
        stub_request(:get, url).to_return(status: 404, body: '{"error":"not found"}')
        post "/imports/#{handle}"
        expect(response.status).to eq(404)
      end
    end
  end
end
