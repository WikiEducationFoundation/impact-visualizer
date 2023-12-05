export default interface TopicTimepoint {
  id: number,
  name: string,
  timestamp: string,
  articles_count: number,
  articles_count_delta: number,
  attributed_articles_created_delta: number,
  attributed_length_delta: number,
  attributed_revisions_count_delta: number,
  attributed_token_count: number,
  average_wp10_prediction: number,
  length: number,
  length_delta: number,
  revisions_count: number,
  revisions_count_delta: number,
  token_count: number,
  token_count_delta: number,
  [index: string]: any
}
