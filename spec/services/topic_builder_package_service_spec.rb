# frozen_string_literal: true

require 'rails_helper'

describe TopicBuilderPackageService do
  let(:handle) { 'tbp_abc123' }
  let(:url) { "https://topic-builder.wikiedu.org/packages/#{handle}" }
  let(:package) do
    {
      'handle' => handle,
      'schema_version' => 1,
      'config' => { 'name' => 'X', 'wiki' => 'en' },
      'articles' => [],
      'article_count' => 0,
      'source_topic' => 'x'
    }
  end

  describe '.valid_handle?' do
    it 'accepts tbp_-prefixed strings' do
      expect(described_class.valid_handle?('tbp_abc')).to eq(true)
    end

    it 'rejects other strings' do
      expect(described_class.valid_handle?('abc')).to eq(false)
      expect(described_class.valid_handle?(nil)).to eq(false)
    end
  end

  describe '.fetch' do
    it 'returns the parsed JSON on 200' do
      stub_request(:get, url).to_return(
        status: 200,
        body: package.to_json,
        headers: { 'Content-Type' => 'application/json' }
      )
      expect(described_class.fetch(handle)).to eq(package)
    end

    it 'raises NotFound on 404' do
      stub_request(:get, url).to_return(status: 404, body: '{"error":"not found"}')
      expect { described_class.fetch(handle) }
        .to raise_error(TopicBuilderPackageService::NotFound)
    end

    it 'raises NotFound when handle does not start with tbp_' do
      expect { described_class.fetch('garbage') }
        .to raise_error(TopicBuilderPackageService::NotFound)
    end

    it 'retries once on 5xx, then succeeds' do
      stub_request(:get, url)
        .to_return(status: 503, body: '')
        .then.to_return(status: 200, body: package.to_json)
      expect(described_class.fetch(handle)).to eq(package)
    end

    it 'raises NetworkError after retry still fails on 5xx' do
      stub_request(:get, url).to_return(status: 503, body: '').times(2)
      expect { described_class.fetch(handle) }
        .to raise_error(TopicBuilderPackageService::NetworkError)
    end

    it 'raises NetworkError on parse failure' do
      stub_request(:get, url).to_return(status: 200, body: 'not json')
      expect { described_class.fetch(handle) }
        .to raise_error(TopicBuilderPackageService::NetworkError, /invalid JSON/)
    end
  end

  describe '.assert_supported_schema!' do
    it 'no-ops on schema_version=1' do
      expect { described_class.assert_supported_schema!('schema_version' => 1) }.not_to raise_error
    end

    it 'raises on other versions' do
      expect { described_class.assert_supported_schema!('schema_version' => 2) }
        .to raise_error(TopicBuilderPackageService::SchemaVersionError)
    end
  end
end
