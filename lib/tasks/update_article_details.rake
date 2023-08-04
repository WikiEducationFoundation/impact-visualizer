# frozen_string_literal: true

task update_article_details: :environment do
  stats_service = ArticleStatsService.new
  total_count = Article.count
  count = 0
  Article.all.in_batches(of: 500) do |batch|
    Parallel.each(batch, in_threads: 10) do |article|
      ActiveRecord::Base.connection_pool.with_connection do
        count += 1
        ap "Updating #{count}/#{total_count}"
        stats_service.update_details_for_article(article:)
        ActiveRecord::Base.connection_pool.release_connection
      end
    end
  end
end
