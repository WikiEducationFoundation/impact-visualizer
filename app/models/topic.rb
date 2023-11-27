# frozen_string_literal: true

class Topic < ApplicationRecord
  ## TODO
  # - High-level caching of deltas between first/last topic_timepoints.
  #   Perhaps with another model though? ... so snapshots can be taken over time.

  ## Associations
  belongs_to :wiki
  has_many :article_bags, -> { order(created_at: :desc) }
  has_many :articles, through: :article_bags
  has_many :topic_users
  has_many :users, through: :topic_users
  has_many :topic_timepoints
  has_many :topic_summaries

  ## Instance methods
  def timestamps
    raise ImpactVisualizerErrors::TopicMissingStartDate unless start_date

    # If end_date is not set, fallback to "now"
    now_or_end_date = end_date || Time.zone.now.beginning_of_day

    # Get total number of days within range... converted from seconds to days, with a 1 day buffer
    total_days = ((now_or_end_date - start_date) / 1.day.to_i) + 1

    # Calculate how many timestamps fit within range
    total_timepoints = (total_days / timepoint_day_interval).ceil

    # Initialize variables for loop
    output = []
    next_date = start_date

    # Build array of dates
    total_timepoints.times do
      output << next_date
      next_date += timepoint_day_interval.days
    end

    # Make sure the end_date gets in there
    output << now_or_end_date if output.last < now_or_end_date

    # Return final array of dates
    output
  end

  def first_timestamp
    timestamps.first
  end

  def last_timestamp
    timestamps.last
  end

  def timestamp_previous_to(timestamp)
    timestamp_index = timestamps.index(timestamp)

    unless timestamp_index
      timestamps.each_with_index do |ts, index|
        if ts > timestamp
          timestamp_index = index - 1
          break
        end
      end
    end
    
    raise ImpactVisualizerErrors::InvalidTimestampForTopic if timestamp_index.nil?
    raise ImpactVisualizerErrors::InvalidTimestampForTopic if timestamp_index.negative?

    return nil unless timestamp_index.positive?
    timestamps[timestamp_index - 1]
  end

  def timestamp_next_to(timestamp)
    timestamp_index = timestamps.index(timestamp)

    unless timestamp_index
      timestamps.each_with_index do |ts, index|
        if ts > timestamp
          timestamp_index = index
          break
        end
      end
    end

    raise ImpactVisualizerErrors::InvalidTimestampForTopic if timestamp_index.nil?
    raise ImpactVisualizerErrors::InvalidTimestampForTopic if timestamp_index.negative?

    return nil unless timestamp_index.positive?
    timestamps[timestamp_index + 1]
  end

  def user_with_wiki_id(wiki_user_id)
    users.find_by(wiki_user_id:)
  end

  def user_count
    users.count
  end

  # TODO
  # Add a field to capture active article bag, but fall back to most recent
  def active_article_bag
    article_bags.last
  end

  def articles_count
    active_article_bag&.articles&.count
  end

  def most_recent_summary
    topic_summaries.last
  end
end

# == Schema Information
#
# Table name: topics
#
#  id                     :bigint           not null, primary key
#  description            :string
#  display                :boolean          default(TRUE)
#  editor_label           :string           default("participant")
#  end_date               :datetime
#  name                   :string
#  slug                   :string
#  start_date             :datetime
#  timepoint_day_interval :integer          default(7)
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  wiki_id                :integer
#
