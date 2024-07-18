# frozen_string_literal: true

class User < ApplicationRecord
  # Associations
  has_many :topic_users
  has_many :topics, through: :topic_users
  belongs_to :wiki

  ## Instance Methods
  def update_name_and_id
    api = WikiActionApi.new(wiki)

    # Update the name, if necessary
    if wiki_user_id && !name
      user_info = api.get_user_info(userid: wiki_user_id)
      update(name: user_info['name'])
    end

    # Update the wiki_user_id, if necessary
    if name && !wiki_user_id
      user_info = api.get_user_info(name:)
      update(wiki_user_id: user_info['userid'])
    end
  end
end

# == Schema Information
#
# Table name: users
#
#  id           :bigint           not null, primary key
#  name         :string
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  wiki_id      :bigint           not null
#  wiki_user_id :integer
#
# Indexes
#
#  index_users_on_wiki_id  (wiki_id)
#
# Foreign Keys
#
#  fk_rails_...  (wiki_id => wikis.id)
#
