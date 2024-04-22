import { useEffect, useState } from "react";
import { INode, NodeId } from "react-accessible-treeview";
import { IFlatMetadata } from "react-accessible-treeview/dist/TreeView/utils";
import CSVButton from "./CSV-button.component";
import { convertCategoryArticlesToCSV } from "../utils/search-utils";
import React from "react";

export default function SelectedNodesDisplay({
  selectedNodes,
}: {
  selectedNodes: Map<NodeId, INode<IFlatMetadata>>;
}) {
  const [articlesCount, setArticlesCount] = useState<number>(0);
  const [categoriesCount, setCategoriesCount] = useState<number>(0);

  useEffect(() => {
    let totalNodeArticlesCount = 0;
    let totalNodeCategoriesCount = 0;
    selectedNodes.forEach((node) => {
      if (node.metadata) {
        const nodeArticlesCount = Object.keys(node.metadata).length;
        if (nodeArticlesCount > 0) {
          totalNodeCategoriesCount += 1;
        }
        totalNodeArticlesCount += nodeArticlesCount;
      }
    });
    setArticlesCount(totalNodeArticlesCount);
    setCategoriesCount(totalNodeCategoriesCount);
  }, [selectedNodes]);
  return (
    <div className="SelectedNodes Box">
      <CSVButton
        articles={selectedNodes.values()}
        csvConvert={convertCategoryArticlesToCSV}
      />
      <h3 className="u-mt1">Selected Articles</h3>
      {articlesCount} articles from {categoriesCount} categories
      <ul>
        {[...selectedNodes.values()].map((node) => {
          return node.metadata
            ? Object.entries(node.metadata).map(([key, value]) => {
                return <li key={key}>{`${value}`}</li>;
              })
            : null;
        })}
      </ul>
    </div>
  );
}
