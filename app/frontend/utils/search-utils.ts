import { INode } from "react-accessible-treeview";
import {
  CategoryNode,
  MediaWikiResponse,
  SPARQLResponse,
} from "../types/search-tool.type";
import { IFlatMetadata } from "react-accessible-treeview/dist/TreeView/utils";

/* slice out category prefix */
const removeCategoryPrefix = (categoryString: string): string => {
  return categoryString.substring(categoryString.indexOf(":") + 1);
};

function buildWikidataQuery(
  occupationIDs: string[],
  genderID: string,
  ethnicityID: string,
  languageCode: string,
  options?: { requireWikipediaArticle?: boolean }
): string {
  const properties = {
    instanceOf: "P31",
    sexOrGender: "P21",
    ethnicGroup: "P172",
    occupation: "P106",
  };
  const qValues = { human: "Q5" };
  let query = `SELECT DISTINCT ?person ?personLabel`;

  if (options?.requireWikipediaArticle !== false) {
    query += ` ?article`;
  }

  query += ` WHERE {
    ?person wdt:${properties.instanceOf} wd:${qValues.human} .`;

  if (genderID) {
    query += `\n    ?person wdt:${properties.sexOrGender} wd:${genderID} .`;
  }

  if (ethnicityID) {
    query += `\n    ?person wdt:${properties.ethnicGroup} wd:${ethnicityID} .`;
  }

  if (occupationIDs.length > 0) {
    query += `\n    ?person wdt:${properties.occupation} ?occ .`;
    query += `\n    VALUES ?occ { ${occupationIDs
      .map((occ) => `wd:${occ}`)
      .join(" ")} }`;
  }

  const articleClauses = `
        ?article schema:about ?person .
        ?article schema:isPartOf <https://${languageCode}.wikipedia.org/> .`;

  if (options?.requireWikipediaArticle) {
    query += articleClauses;
  } else {
    query += `\n    OPTIONAL {${articleClauses}\n    }`;
  }

  query += `
    SERVICE wikibase:label { bd:serviceParam wikibase:language "${languageCode}" }
  }`;

  return encodeURIComponent(query);
}

function convertSPARQLArticlesToCSV(
  articles: SPARQLResponse["results"]["bindings"]
): string {
  let csvContent = "data:text/csv;charset=utf-8,";

  articles.forEach((item) => {
    csvContent += `"${item.personLabel.value}"\n`;
  });

  return csvContent;
}

function convertCategoryArticlesToCSV(articles: string[]): string {
  let csvContent = "data:text/csv;charset=utf-8,";
  for (const article of articles) {
    csvContent += `"${article}"\n`;
  }

  return csvContent;
}

function convertDashboardDataToCSV(data: string[] | undefined): string {
  let csvContent = "data:text/csv;charset=utf-8,";

  data?.forEach((item) => {
    csvContent += `"${item}"\n`;
  });

  return csvContent;
}

function downloadAsCSV(csvContent: string, fileName = "data.csv"): void {
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", fileName);
  link.click();
}

const convertInitialResponseToTree = (
  response: MediaWikiResponse,
  existingIDs: INode<IFlatMetadata>[],
  elementId: number,
  parentName: string
): CategoryNode => {
  let articleCount = 0;
  const pages = response.query.pages;

  const parentNode: CategoryNode = {
    name: removeCategoryPrefix(parentName).replaceAll("_", " "),
    isBranch: true,
    id: elementId + 1,
    metadata: {},
    children: [],
  };

  const rootNode: CategoryNode = {
    name: "root",
    isBranch: true,
    id: elementId,
    metadata: {},
    children: [parentNode],
  };

  let hasSubcategories = false;
  for (const [, value] of Object.entries(pages)) {
    if (value.categoryinfo) {
      let isDuplicateNode = false;
      existingIDs.forEach((e) => {
        if (e.id === value.pageid) {
          isDuplicateNode = true;
        }
      });

      if (isDuplicateNode) {
        continue;
      }
      const categoryName: string = `${removeCategoryPrefix(value.title)} (${
        value.categoryinfo.subcats
      } C, ${value.categoryinfo.pages} P)`;

      parentNode.children?.push({
        name: categoryName,
        id: value.pageid,
        isBranch: value.categoryinfo.subcats > 0,
        metadata: {},
        children: [],
      });
      hasSubcategories = true;
    } else if (parentNode.metadata) {
      parentNode.metadata[value.pageid] = value.title;
      articleCount += 1;
    }
  }
  parentNode.name =
    parentNode.name + ` (${parentNode?.children?.length} C, ${articleCount} P)`;

  if (!hasSubcategories && rootNode.children) {
    rootNode.children[0].isBranch = false;
  }
  return rootNode;
};

const convertResponseToTree = (
  response: MediaWikiResponse,
  parent: INode<IFlatMetadata>
): INode<IFlatMetadata>[] => {
  const pages = response.query.pages;

  const subcats: INode<IFlatMetadata>[] = [];
  for (const [, value] of Object.entries(pages)) {
    if (value.categoryinfo) {
      const categoryName: string = `${removeCategoryPrefix(value.title)} (${
        value.categoryinfo.subcats
      } C, ${value.categoryinfo.pages} P)`;

      subcats.push({
        name: categoryName,
        id: value.pageid,
        isBranch: value.categoryinfo.subcats > 0,
        metadata: {},
        children: [],
        parent: parent.id,
      });
    } else if (parent.metadata) {
      parent.metadata[value.pageid] = value.title;
    }
  }

  return subcats;
};

const removeDuplicateArticles = (
  selectedArticles: {
    articleId: string;
    articleTitle: string;
  }[]
) => {
  const uniqueIds = new Set();
  return selectedArticles.filter((article) => {
    if (uniqueIds.has(article.articleId)) {
      return false;
    } else {
      uniqueIds.add(article.articleId);
      return true;
    }
  });
};

function extractDashboardURLInfo(url: string): {
  dashboardURL: string;
  type: string;
  slug: string;
} {
  const protocolIndex = url.indexOf("://");
  if (protocolIndex === -1) {
    throw new Error("Invalid URL: protocol not found");
  }

  const urlAfterProtocol = url.slice(protocolIndex + 3);

  // Remove trailing slashes and then split
  const parts = urlAfterProtocol.replace(/\/+$/, "").split("/");

  let course_slug = "";
  let maxPartsLength: number;
  let type: string;
  if (parts[1] === "campaigns") {
    maxPartsLength = 3;
    course_slug = parts[2];
    type = "campaign";
  } else if (parts[1] === "courses") {
    maxPartsLength = 4;
    course_slug = `${parts[2]}-${parts[3]}`;
    type = "course";
  } else {
    throw new Error("Invalid URL: unrecognized path");
  }

  if (parts.length < maxPartsLength) {
    throw new Error(
      "Invalid URL: does not contain enough parts after the domain"
    );
  }

  const extractedUrl =
    url.slice(0, protocolIndex + 3) + parts.slice(0, maxPartsLength).join("/");

  return {
    dashboardURL: extractedUrl,
    type: type,
    slug: course_slug,
  };
}

export {
  buildWikidataQuery,
  convertSPARQLArticlesToCSV,
  convertCategoryArticlesToCSV,
  convertDashboardDataToCSV,
  downloadAsCSV,
  convertInitialResponseToTree,
  convertResponseToTree,
  removeCategoryPrefix,
  removeDuplicateArticles,
  extractDashboardURLInfo,
};
