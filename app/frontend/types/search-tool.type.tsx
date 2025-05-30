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
      person: {
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
    users: CourseUser[];
  };
};

type CourseArticlesResponse = {
  course: {
    articles: CourseArticle[];
  };
};

type CourseUser = {
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

type CourseArticle = {
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

type CampaignUsersResponse = {
  campaign: string;
  users: CampaignUser[];
};

type CampaignArticlesResponse = {
  campaign: string;
  articles: CampaignArticle[];
};

type CampaignUser = {
  course: string;
  role: string;
  username: string;
};

type CampaignArticle = {
  title: string;
  wiki: { id: number; language: string; project: string };
};

type PetscanResponse = {
  "*": [
    {
      a: {
        "*": PetscanPage[];
        type: "union";
      };
      n: string;
    }
  ];
  a: {
    query: string;
    querytime_sec: number;
  };
  n: string;
};

type PagePileResponse = {
  pages: string[];
  wiki: string;
  id: number;
  pages_returned: number;
  pages_total: number;
  sort_order: string;
  language: string;
  project: string;
};

type PetscanPage = {
  id: number;
  len: number;
  metadata?: {
    wikidata?: string;
  };
  n: string;
  namespace: number;
  nstext: string;
  q: string;
  title: string;
  touched: string;
};

type UserSetResponse = {
  courses: {
    title: string;
    slug: string;
    students: {
      username: string;
    }[];
    instructors?: {
      username: string;
    }[];
  }[];
};

type DashboardUserToolResponse = {
  user_profiles: {
    course_title: string;
    course_slug: string;
    articles: {
      article_id: number;
      article_title: string;
    }[];
    users: {
      username: string;
    }[];
  }[];
};

export type {
  SPARQLResponse,
  MediaWikiResponse,
  CategoryNode,
  QueryProperty,
  Suggestion,
  CourseUsersResponse,
  CourseArticlesResponse,
  CampaignUsersResponse,
  CampaignArticlesResponse,
  PetscanResponse,
  PagePileResponse,
  UserSetResponse,
  DashboardUserToolResponse,
};
