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

  useEffect(() => {
    let count = 0;
    selectedNodes.forEach((node) => {
      if (node.metadata) {
        count += Object.keys(node.metadata).length;
      }
    });
    setArticlesCount(count);
  }, [selectedNodes]);
  return (
    <div className="selected-nodes">
      <CSVButton
        articles={selectedNodes.values()}
        csvConvert={convertCategoryArticlesToCSV}
      />
      <h3>Selected Articles</h3>
      {articlesCount} articles from {selectedNodes.size} categories
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
