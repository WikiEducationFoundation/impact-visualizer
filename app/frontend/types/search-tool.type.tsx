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

export type {
  SPARQLResponse,
  MediaWikiResponse,
  CategoryNode,
  QueryProperty,
  Suggestion,
};
