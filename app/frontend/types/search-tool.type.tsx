import { IFlatMetadata } from "react-accessible-treeview/dist/TreeView/utils";

type SPARQLResponse = {
  head: {
    vars: string[];
  };
  results: {
    bindings: Array<{
      article: {
        type: string;
        value: string;
      };
      personLabel: {
        "xml:lang": string;
        type: string;
        value: string;
      };
    }>;
  };
};

type MediaWikiResponse = {
  batchcomplete: string;
  continue?: {
    gcmcontinue: string;
    continue: string;
  };
  query: {
    pages: {
      [key: string]: {
        pageid: number;
        ns: number;
        title: string;
        categoryinfo?: {
          size: number;
          pages: number;
          files: number;
          subcats: number;
        };
      };
    };
  };
  error?: {
    code: string;
    info: string;
    "*": string;
  };
  servedby?: string;
};

type CategoryNode = {
  name: string;
  id: number;
  isBranch: boolean;
  metadata?: IFlatMetadata;
  children?: CategoryNode[];
  parent?: string | number;
};

type QueryProperty = {
  key: string;
  property: string;
  qValue: { id: string; label: string };
};

type Suggestion = {
  label: string;
  description: string;
  id: string;
};

type CourseUsersResponse = {
  course: {
    users: User[];
  };
};

type CourseArticlesResponse = {
  course: {
    articles: Article[];
  };
};

type User = {
  character_sum_ms: number;
  character_sum_us: number;
  character_sum_draft: number;
  references_count: number;
  role: number;
  role_description: string | null;
  recent_revisions: number;
  content_expert: boolean;
  program_manager: boolean;
  contribution_url: string;
  sandbox_url: string;
  total_uploads: number | null;
  id: number;
  username: string;
  enrolled_at: string;
  admin: boolean;
  course_training_progress_description: string;
  course_training_progress_assigned_count: number;
  course_training_progress_completed_count: number;
  real_name?: string;
};

type Article = {
  character_sum: number;
  references_count: number;
  view_count: number;
  new_article: boolean;
  tracked: boolean;
  id: number;
  namespace: number;
  rating: number | null;
  deleted: boolean;
  title: string;
  language: string;
  project: string;
  url: string;
  rating_num: number;
  pretty_rating: string | null;
  user_ids: number[];
};

export type {
  SPARQLResponse,
  MediaWikiResponse,
  CategoryNode,
  QueryProperty,
  Suggestion,
  CourseUsersResponse,
  CourseArticlesResponse,
};
