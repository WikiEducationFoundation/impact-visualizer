type ArticleProtection = {
  type: string;
  level: string;
  expiry: string;
};

type ArticleAnalytics = {
  average_daily_views: number;
  article_size: number;
  prev_article_size: number | null;
  talk_size: number;
  prev_talk_size: number | null;
  lead_section_size: number;
  prev_average_daily_views: number | null;
  linguistic_versions_count: number;
  warning_tags_count: number;
  images_count: number;
  number_of_editors: number;
  assessment_grade: string | null;
  publication_date: string | null;
  article_protections: ArticleProtection[];
};

type NumericSortField =
  | "linguistic_versions_count"
  | "article_size"
  | "lead_section_size"
  | "talk_size"
  | "warning_tags_count"
  | "images_count";

type XAxisKey = "title" | "publication_date" | NumericSortField;
type YAxisKey = "average_daily_views" | "number_of_editors";

type NumericSortableArticle = { article: string } & Record<
  NumericSortField,
  number
>;

export type {
  ArticleProtection,
  ArticleAnalytics,
  NumericSortField,
  XAxisKey,
  YAxisKey,
  NumericSortableArticle,
};
