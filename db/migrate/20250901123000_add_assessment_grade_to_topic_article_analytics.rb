class AddAssessmentGradeToTopicArticleAnalytics < ActiveRecord::Migration[7.0]
  def change
    add_column :topic_article_analytics, :assessment_grade, :string
  end
end


