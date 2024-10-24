# frozen_string_literal: true

class Queries
  def self.topic_timepoint_classification_count(topic_timepoint_id:, classification_id:)
    sql = %{
      SELECT count(articles.id)
        FROM topic_timepoints
      JOIN topic_article_timepoints
        ON topic_article_timepoints.topic_timepoint_id = topic_timepoints.id
      JOIN article_timepoints
        ON topic_article_timepoints.article_timepoint_id = article_timepoints.id
      JOIN articles ON articles.id = article_timepoints.article_id
      JOIN article_classifications ON articles.id = article_classifications.article_id
      JOIN classifications ON classifications.id = article_classifications.classification_id
      WHERE topic_timepoints.id = #{topic_timepoint_id}
        AND classifications.id = #{classification_id}
      GROUP BY classifications.id
    }
    results = ActiveRecord::Base.connection.exec_query(sql)
    results[0]&.dig('count') || 0
  end

  def self.topic_timepoint_classification_values_for_property(classification_id:,
                                                              topic_timepoint_id:,
                                                              property_id:)
    sql = %{
      SELECT
        jsonb_path_query_array(
          article_classifications.properties,
          '$[*] ? (@.property_id == "#{property_id}")."value_ids"[*]'
        ) as values,
        count(articles.id)
      FROM topic_timepoints
      JOIN topic_article_timepoints
        ON topic_article_timepoints.topic_timepoint_id = topic_timepoints.id
      JOIN article_timepoints
        ON topic_article_timepoints.article_timepoint_id = article_timepoints.id
      JOIN articles ON articles.id = article_timepoints.article_id
      JOIN article_classifications ON articles.id = article_classifications.article_id
      JOIN classifications ON classifications.id = article_classifications.classification_id
      WHERE topic_timepoints.id = #{topic_timepoint_id}
        AND classifications.id = #{classification_id}
      GROUP BY values
    }

    ActiveRecord::Base.connection.exec_query(sql).rows
  end

  def self.article_bag_classification_values_for_property(classification_id:,
                                                          article_bag_id:,
                                                          property_id:)
    sql = %{
      SELECT
        jsonb_path_query_array(
          article_classifications.properties,
          '$[*] ? (@.property_id == "#{property_id}")."value_ids"[*]'
        ) as values,
        count(articles.id)
      FROM article_classifications
      JOIN classifications ON article_classifications.classification_id = classifications.id
      JOIN articles ON article_classifications.article_id = articles.id
      JOIN article_bags ON article_classifications.article_id = articles.id
      WHERE article_bags.id = #{article_bag_id}
        AND classifications.id = #{classification_id}
      GROUP BY values
    }

    ActiveRecord::Base.connection.exec_query(sql).rows
  end
end
