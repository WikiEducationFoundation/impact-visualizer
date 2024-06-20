# frozen_string_literal: true

class TopicEditor < ApplicationRecord
  ## Associations
  has_many :topic_editor_topics
  has_many :topics, through: :topic_editor_topics

  ## Mixins
  devise :rememberable, :omniauthable, omniauth_providers: %i[mediawiki]

  ## Class Methods
  def self.from_omniauth(auth)
    find_or_create_by(provider: auth.provider, uid: auth.uid) do |topic_editor|
      topic_editor.username = auth.info.name
    end
  end

  ## Instance Methods
  def can_edit_topic?(topic)
    topic_editor_topics.exists?(topic:)
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
