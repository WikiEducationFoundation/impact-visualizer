export default interface Topic {
  id: number,
  name: string,
  description: string,
  user_count: number,
  slug: string,
  start_date: string,
  end_date: string,
  timepoint_day_interval: number
  articles_count: number,
  articles_count_delta: number,
  attributed_articles_created_delta: number,
  attributed_length_delta: number,
  attributed_revisions_count_delta: number,
  attributed_token_count: number,
  average_wp10_prediction: number,
  wp10_prediction_categories: object,
  length: number,
  length_delta: number,
  revisions_count: number,
  revisions_count_delta: number,
  token_count: number,
  token_count_delta: number
}
