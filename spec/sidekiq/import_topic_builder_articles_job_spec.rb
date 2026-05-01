# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ImportTopicBuilderArticlesJob, type: :job do
  let!(:wiki) { Wiki.find_or_create_by!(language: 'en', project: 'wikipedia') }
  let(:handle) { 'tbp_abc123' }
  let(:url) { "https://topic-builder.wikiedu.org/packages/#{handle}" }
  let(:topic) { create(:topic, wiki: wiki, tb_handle: handle) }
  let(:bag) { topic.active_article_bag }
  let(:package) do
    {
      'handle' => handle,
      'schema_version' => 1,
      'config' => { 'name' => topic.name, 'wiki' => 'en' },
      'articles' => [
        { 'title' => 'Achievement gap', 'centrality' => 8 },
        { 'title' => 'Active learning', 'centrality' => nil }
      ]
    }
  end

  before do
    bag # force the empty bag into existence (the factory creates one)
    stub_request(:get, url).to_return(
      status: 200, body: package.to_json,
      headers: { 'Content-Type' => 'application/json' }
    )
  end

  it 'fetches the package and populates the bag' do
    expect {
      described_class.new.perform(topic.id, handle)
    }.to change { bag.reload.article_bag_articles.count }.from(0).to(2)
      .and change(Article, :count).by(2)
  end

  it 'persists centrality scores per article' do
    described_class.new.perform(topic.id, handle)
    scores = bag.reload.article_bag_articles.includes(:article)
                .map { |a| [a.article.title, a.centrality] }.to_h
    expect(scores).to eq('Achievement gap' => 8, 'Active learning' => nil)
  end

  it 'clears article_import_job_id when finished' do
    topic.update(article_import_job_id: 'fake-job-id')
    described_class.new.perform(topic.id, handle)
    expect(topic.reload.article_import_job_id).to be_nil
  end

  it 'is idempotent on retry — does not duplicate ArticleBagArticles' do
    described_class.new.perform(topic.id, handle)
    expect {
      described_class.new.perform(topic.id, handle)
    }.not_to change { bag.reload.article_bag_articles.count }
  end
end
