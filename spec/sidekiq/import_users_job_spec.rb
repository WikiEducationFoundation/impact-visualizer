# frozen_string_literal: true
require 'rails_helper'

RSpec.describe ImportUsersJob, type: :job do
  let(:topic) { create(:topic) }

  it 'hands off to ImportService' do
    Sidekiq::Testing.inline!
    expect_any_instance_of(ImportService).to receive(:import_users)
    expect_any_instance_of(Topic).to receive(:update).with(users_import_job_id: nil)
    described_class.new.perform(topic.id)
  end

  it 'chains to the post-import handler once the import finishes' do
    Sidekiq::Testing.inline!
    allow_any_instance_of(ImportService).to receive(:import_users)
    expect_any_instance_of(Topic).to receive(:chain_after_user_import)
    described_class.new.perform(topic.id)
  end
end
