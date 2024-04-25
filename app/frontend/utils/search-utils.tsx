import { INode } from "react-accessible-treeview";
import {
  CategoryNode,
  MediaWikiResponse,
  SPARQLResponse,
} from "../types/search-tool.type";
import { IFlatMetadata } from "react-accessible-treeview/dist/TreeView/utils";

function buildWikidataQuery(
  occupationIDs: string[],
  genderID: string,
  ethnicityID: string
): string {
  const properties = {
    instanceOf: "P31",
    sexOrGender: "P21",
    ethnicGroup: "P172",
    occupation: "P106",
  };
  const qValues = { human: "Q5" };
  let query = `SELECT DISTINCT ?article ?personLabel WHERE {
    ?person wdt:${properties.instanceOf} wd:${qValues.human} .`;

  if (genderID) {
    query += `\n    ?person wdt:${properties.sexOrGender} wd:${genderID} .`;
  }

  if (ethnicityID) {
    query += `\n    ?person wdt:${properties.ethnicGroup} wd:${ethnicityID} .`;
  }

  if (occupationIDs.length > 0) {
    query += `\n    ?person wdt:${
      properties.occupation
    } ?occ .\n    VALUES ?occ { ${occupationIDs
      .map((occ) => `wd:${occ}`)
      .join(" ")} }`;
  }

  query += `
    ?article schema:about ?person .
    ?article schema:isPartOf <https://en.wikipedia.org/>.
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}`;

  return encodeURIComponent(query);
}

function convertSPARQLArticlesToCSV(
  articles: SPARQLResponse["results"]["bindings"]
): string {
  let csvContent = "data:text/csv;charset=utf-8,Articles\n";

  articles.forEach((item) => {
    csvContent += `"${item.personLabel.value}"\n`;
  });

  return csvContent;
}

function convertCategoryArticlesToCSV(
  categories: IterableIterator<INode<IFlatMetadata>>
): string {
  let csvContent = "data:text/csv;charset=utf-8,Articles\n";
  for (const category of categories) {
    const metadata = category.metadata || {};
    for (const article of Object.values(metadata)) {
      csvContent += `"${article}"\n`;
    }
  }

  return csvContent;
}

function downloadAsCSV(csvContent: string, fileName = "articles.csv"): void {
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
    name: parentName.slice(9).replaceAll("_", " "),
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
      const categoryName: string = `${
        value.title.slice(9) /* slice out "category:" prefix */
      } (${value.categoryinfo.subcats} C, ${value.categoryinfo.pages} P)`;

      parentNode.children?.push({
        name: categoryName,
        id: value.pageid,
        isBranch: value.categoryinfo.subcats > 0,
        metadata: {},
        children: [],
      });
    } else if (parentNode.metadata) {
      parentNode.metadata[value.pageid] = value.title;
      articleCount += 1;
    }
  }
  parentNode.name =
    parentNode.name + ` (${parentNode?.children?.length} C, ${articleCount} P)`;

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
      const categoryName: string = `${
        value.title.slice(9) /* slice out "category:" prefix */
      } (${value.categoryinfo.subcats} C, ${value.categoryinfo.pages} P)`;

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

export {
  buildWikidataQuery,
  convertSPARQLArticlesToCSV,
  convertCategoryArticlesToCSV,
  downloadAsCSV,
  convertInitialResponseToTree,
  convertResponseToTree,
};
