import { INode, NodeId } from "react-accessible-treeview";
import { IFlatMetadata } from "react-accessible-treeview/dist/TreeView/utils";
import CSVButton from "./CSV-button.component";
import {
  convertCategoryArticlesToCSV,
  removeDuplicateArticles,
} from "../utils/search-utils";
import React from "react";

export default function SelectedNodesDisplay({
  categoryName,
  selectedNodes,
}: {
  categoryName: string;
  selectedNodes: Map<NodeId, INode<IFlatMetadata>>;
}) {
  let categoriesCount = 0;
  const selectedCategories = [...selectedNodes.values()].map((node) => {
    return node.metadata
      ? Object.entries(node.metadata).map(([key, value]) => {
          return { [key]: String(value) };
        })
      : [];
  });

  let selectedArticles = selectedCategories
    .reduce((acc, node) => {
      acc = [...acc, ...node];
      categoriesCount += 1;

      return acc;
    }, [])
    .map((article) => {
      const [id] = Object.keys(article);
      return { articleId: id, articleTitle: article[id] };
    });
  selectedArticles = removeDuplicateArticles(selectedArticles);

  return (
    <div className="SelectedNodes Box">
      <CSVButton
        articles={selectedArticles.map((article) => article.articleTitle)}
        csvConvert={convertCategoryArticlesToCSV}
        filename={`${categoryName}-wikicategory-articles.csv`}
      />
      <h3 className="u-mt1">Selected Articles</h3>
      {selectedArticles.length} articles from {categoriesCount} categories
      <ul>
        {selectedArticles.map((article) => {
          return <li key={article.articleId}>{`${article.articleTitle}`}</li>;
        })}
      </ul>
    </div>
  );
}
