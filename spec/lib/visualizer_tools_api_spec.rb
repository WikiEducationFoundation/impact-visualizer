# frozen_string_literal: true

require 'rails_helper'

describe VisualizerToolsApi do
  describe 'error handling' do
    let(:subject) { described_class.new.get_page_edits_count(page_id: 15613) }

    it 'handles API errors gracefully' do
      stub_visualizer_tools_503_error
      expect { subject }.to raise_error(Faraday::ClientError)
    end

    it 'handles 429 errors gracefully' do
      stub_visualizer_tools_429_error
      expect { subject }.to raise_error(Faraday::ClientError)
    end

    it 'handles timeout errors gracefully' do
      allow_any_instance_of(Faraday::Connection).to receive(:send)
        .and_raise(Faraday::TimeoutError)
      expect_any_instance_of(described_class).to receive(:log_error).once
      expect(subject).to eq(nil)
    end
  end

  describe '#get_page_edits_count' do
    it 'returns total count of edits', :vcr do
      visualizer_tools_api = described_class.new
      count = visualizer_tools_api.get_page_edits_count(page_id: 15613)
      expect(count).to be_a(Integer)
      expect(count).to eq(11679)
    end

    it 'returns total count of edits between revision IDs', :vcr do
      visualizer_tools_api = described_class.new
      count = visualizer_tools_api.get_page_edits_count(
        page_id: 15613,
        from_rev_id: 1159158915,
        to_rev_id: 1161912094
      )
      expect(count).to be_a(Integer)
      expect(count).to eq(2)
    end
  end
end
