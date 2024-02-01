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
end
