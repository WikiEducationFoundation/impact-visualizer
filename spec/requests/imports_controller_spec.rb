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
  let!(:topic_editor) { create(:topic_editor, username: 'wiki_editor') }

  describe 'GET /imports/:handle' do
    context 'when not signed in' do
      it 'redirects to topic-editor sign-in' do
        get "/imports/#{handle}"
        expect(response).to redirect_to(topic_editor_mediawiki_omniauth_authorize_path)
      end
    end

    context 'when signed in as a topic editor' do
      before { sign_in topic_editor }

      it 'renders the preview' do
        stub_request(:get, url).to_return(
          status: 200, body: package.to_json,
          headers: { 'Content-Type' => 'application/json' }
        )
        get "/imports/#{handle}"
        expect(response.status).to eq(200)
        expect(response.body).to include('Educational Psychology')
        expect(response.body).to include('Import topic')
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
          status: 200, body: package.merge('schema_version' => 3).to_json
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
      it 'redirects to topic-editor sign-in' do
        post "/imports/#{handle}"
        expect(response).to redirect_to(topic_editor_mediawiki_omniauth_authorize_path)
      end
    end

    context 'when signed in as a topic editor' do
      before { sign_in topic_editor }

      it 'creates the topic, associates it with the editor, and enqueues ingestion' do
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
        expect(topic_editor.reload.topics).to include(topic)
        expect(response).to redirect_to("/topics/#{topic.id}")
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
        # Topic's article_import_job_id matches the enqueued job's jid —
        # i.e. the column was set before the job was enqueued, so a
        # fast-worker race can't leave a stale id behind.
        expect(enqueued['jid']).to eq(topic.article_import_job_id)
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

  describe 'sync flow (re-publish of an already-imported topic)' do
    let(:source_topic_id) { 42 }
    let(:existing_topic) do
      create(:topic, wiki:, tb_handle: 'tbp_old', tb_source_topic_id: source_topic_id)
    end
    let(:bag) { existing_topic.active_article_bag }
    let(:article) { Article.create!(title: 'Achievement gap', wiki:, pageid: 1) }
    let(:sync_package) do
      package.merge(
        'source_topic_id' => source_topic_id,
        'articles' => [
          { 'title' => 'Achievement gap', 'centrality' => 9 },
          { 'title' => 'Bloom\'s taxonomy', 'centrality' => 5 }
        ]
      )
    end

    before do
      create(:article_bag_article, article_bag: bag, article:, centrality: 8)
    end

    describe 'GET /imports/:handle' do
      before { sign_in admin }

      it 'renders the sync preview when source_topic_id matches an existing topic' do
        stub_request(:get, url).to_return(
          status: 200, body: sync_package.to_json,
          headers: { 'Content-Type' => 'application/json' }
        )
        get "/imports/#{handle}"
        expect(response.status).to eq(200)
        expect(response.body).to include('Sync from Topic Builder')
        expect(response.body).to include(existing_topic.name)
        expect(response.body).to include('Apply sync')
      end

      it 'falls back to create preview when source_topic_id is missing' do
        stub_request(:get, url).to_return(
          status: 200, body: package.to_json,
          headers: { 'Content-Type' => 'application/json' }
        )
        get "/imports/#{handle}"
        expect(response.status).to eq(200)
        expect(response.body).to include('Import topic')
        expect(response.body).not_to include('Apply sync')
      end

      it 'falls back to create preview when no IV topic matches the source_topic_id' do
        stub_request(:get, url).to_return(
          status: 200,
          body: package.merge('source_topic_id' => 99_999).to_json,
          headers: { 'Content-Type' => 'application/json' }
        )
        get "/imports/#{handle}"
        expect(response.status).to eq(200)
        expect(response.body).to include('Import topic')
      end
    end

    describe 'POST /imports/:handle' do
      before { sign_in admin }

      it 'enqueues SyncTopicBuilderArticlesJob and redirects to the existing topic' do
        stub_request(:get, url).to_return(
          status: 200, body: sync_package.to_json,
          headers: { 'Content-Type' => 'application/json' }
        )

        expect {
          post "/imports/#{handle}"
        }.to change(SyncTopicBuilderArticlesJob.jobs, :size).by(1)
          .and change(Topic, :count).by(0)
          .and change(ImportTopicBuilderArticlesJob.jobs, :size).by(0)

        expect(response).to redirect_to("/topics/#{existing_topic.id}")

        enqueued = SyncTopicBuilderArticlesJob.jobs.last
        expect(enqueued['args']).to eq([existing_topic.id, handle])
        expect(enqueued['jid']).to eq(existing_topic.reload.article_import_job_id)
      end
    end

    describe 'POST /imports/:handle — non-owner topic editor' do
      it 'denies sync and redirects with an alert' do
        sign_in topic_editor
        stub_request(:get, url).to_return(
          status: 200, body: sync_package.to_json,
          headers: { 'Content-Type' => 'application/json' }
        )

        expect {
          post "/imports/#{handle}"
        }.to change(SyncTopicBuilderArticlesJob.jobs, :size).by(0)

        expect(response).to redirect_to("/topics/#{existing_topic.id}")
        expect(flash[:alert]).to include("don't have permission")
      end
    end
  end
end
