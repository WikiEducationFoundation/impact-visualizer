# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ImportArticlesJob, type: :job do
  let(:topic) { create(:topic) }

  it 'hands off to ImportService' do
    expect(ImportService).to receive(:initialize)
    Sidekiq::Testing.inline!

    described_class.new.perform(topic.id)
  end
end
