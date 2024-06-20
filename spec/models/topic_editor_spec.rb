# frozen_string_literal: true

require 'rails_helper'

RSpec.describe TopicEditor do
  it { is_expected.to have_many(:topic_editor_topics) }
  it { is_expected.to have_many(:topics).through(:topic_editor_topics) }

  describe '#can_edit_topic?' do
    it 'returns false if TopicEditor does not have association with Topic' do
      topic = create(:topic)
      topic_editor = create(:topic_editor)
      expect(topic_editor.can_edit_topic?(topic)).to eq(false)
    end

    it 'returns true if TopicEditor has association with Topic' do
      topic = create(:topic)
      topic_editor = create(:topic_editor)
      topic_editor.topics << topic
      expect(topic_editor.can_edit_topic?(topic)).to eq(true)
    end
  end
end

# == Schema Information
#
# Table name: topic_editors
#
#  id                  :bigint           not null, primary key
#  provider            :string
#  remember_created_at :datetime
#  uid                 :string
#  username            :string
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#
