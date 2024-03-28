import React, { FC, useState } from "react";
import TreeView, {
  INode,
  ITreeViewOnLoadDataProps,
  ITreeViewOnNodeSelectProps,
  NodeId,
  flattenTree,
} from "react-accessible-treeview";
import { FaSquare, FaCheckSquare, FaMinusSquare } from "react-icons/fa";
import { IoMdArrowDropright } from "react-icons/io";
import { AiOutlineLoading } from "react-icons/ai";
import { CategoryNode } from "../types/search-tool.type";
import { IFlatMetadata } from "react-accessible-treeview/dist/TreeView/utils";
import { fetchSubcatsAndPages } from "../services/articles.service";
import { convertResponseToTree } from "../utils/search-utils";
import SelectedNodesDisplay from "./SelectedNodesDisplay";

export default function CategoryTree({ treeData }: { treeData: CategoryNode }) {
  const [categoryTree, setCategoryTree] = useState<INode<IFlatMetadata>[]>(
    flattenTree(treeData)
  );
  const [nodesAlreadyLoaded, setNodesAlreadyLoaded] = useState<
    INode<IFlatMetadata>[]
  >([]);
  const [manuallySelectedNodes, setManuallySelectedNodes] = useState<
    Map<NodeId, INode<IFlatMetadata>>
  >(new Map());

  const DEPTH_LIMIT: number = 1;
  const updateTreeData = (
    currentTree: INode<IFlatMetadata>[],
    id: NodeId,
    children: INode<IFlatMetadata>[]
  ) => {
    const data = currentTree.map((node) => {
      if (node.id === id) {
        node.children = children.map((el) => {
          return el.id;
        });
      }
      return node;
    });

    // only add children if they are not already in the tree
    for (const child of children) {
      if (!data.find((el) => el.id === child.id)) {
        data.push(child);
      }
    }

    return data;
  };

  const fetchChildrenRecursively = async (
    node: INode<IFlatMetadata>,
    depth: number = 0
  ) => {
    if (depth > DEPTH_LIMIT && node.isBranch) {
      return [];
    }
    const fetchedSubcatsAndPages = await fetchSubcatsAndPages(node.id, true);
    if (!fetchedSubcatsAndPages) {
      console.error("Invalid Response (possibly null)");
      return [];
    }
    const parsedData = convertResponseToTree(fetchedSubcatsAndPages, node);
    for (const childNode of parsedData) {
      const fetchedChildren = await fetchChildrenRecursively(
        childNode,
        depth + 1
      );

      if (!childNode.isBranch) {
        continue;
      }

      setCategoryTree((value) => {
        return updateTreeData(value, childNode.id, fetchedChildren);
      });
      childNode.children = fetchedChildren.map((child) => child.id);
    }
    return parsedData;
  };
  const onLoadData = async (loadProps: ITreeViewOnLoadDataProps) => {
    const element = loadProps.element;
    if (element.children.length > 0) {
      return;
    }

    const fetchedData = await fetchChildrenRecursively(element);
    return new Promise<void>((resolve) => {
      if (element.children.length > 0) {
        resolve();
        return;
      }
      setCategoryTree((value) => {
        return updateTreeData(value, element.id, fetchedData);
      });

      resolve();
    });
  };

  const handleNodeSelect = (selectProps: ITreeViewOnNodeSelectProps) => {
    selectProps.isSelected &&
      setManuallySelectedNodes((prevSelectedMap) =>
        new Map(prevSelectedMap).set(
          selectProps.element.id,
          selectProps.element
        )
      );
    !selectProps.isSelected &&
      setManuallySelectedNodes((prevSelectedMap) => {
        const newMap = new Map(prevSelectedMap);
        newMap.delete(selectProps.element.id);
        return newMap;
      });
  };

  const wrappedOnLoadData = async (loadProps: ITreeViewOnLoadDataProps) => {
    const nodeHasNoChildData = loadProps.element.children.length === 0;
    const nodeHasAlreadyBeenLoaded = nodesAlreadyLoaded.find(
      (e) => e.id === loadProps.element.id
    );

    if (!nodeHasAlreadyBeenLoaded) {
      await onLoadData(loadProps);
    }

    if (nodeHasNoChildData && !nodeHasAlreadyBeenLoaded) {
      setNodesAlreadyLoaded([...nodesAlreadyLoaded, loadProps.element]);
    }
  };
  return (
    <div className="category-tree-container">
      <div className="checkbox">
        <TreeView
          data={categoryTree}
          aria-label="Checkbox tree"
          multiSelect
          propagateSelect
          propagateSelectUpwards
          togglableSelect
          onLoadData={wrappedOnLoadData}
          onSelect={handleNodeSelect}
          nodeRenderer={({
            element,
            isBranch,
            isExpanded,
            isSelected,
            isHalfSelected,
            getNodeProps,
            level,
            handleSelect,
            handleExpand,
          }) => {
            const branchNode = (
              isExpanded: boolean,
              element: INode<IFlatMetadata>
            ) => {
              return isExpanded && element.children.length === 0 ? (
                <AiOutlineLoading className="loading-icon" />
              ) : (
                <ArrowIcon isOpen={isExpanded} />
              );
            };
            return (
              <div
                {...getNodeProps({ onClick: handleExpand })}
                style={{ marginLeft: 40 * (level - 1) }}
              >
                {isBranch && branchNode(isExpanded, element)}
                <CheckBoxIcon
                  onClick={(e) => {
                    handleSelect(e);
                    e.stopPropagation();
                  }}
                  variant={
                    isHalfSelected ? "some" : isSelected ? "all" : "none"
                  }
                />
                <span className="name">{element.name}</span>
              </div>
            );
          }}
        />
      </div>
      <SelectedNodesDisplay selectedNodes={manuallySelectedNodes} />
    </div>
  );
}

const ArrowIcon: FC<ArrowIconProps> = ({ isOpen, className = "" }) => {
  const classes = `arrow ${
    isOpen ? "arrow--open" : "arrow--closed"
  } ${className}`;
  return <IoMdArrowDropright className={classes} />;
};

const CheckBoxIcon: FC<CheckBoxIconProps> = ({ variant, onClick }) => {
  switch (variant) {
    case "all":
      return <FaCheckSquare onClick={onClick} className="checkbox-icon" />;
    case "none":
      return <FaSquare onClick={onClick} className="checkbox-icon" />;
    case "some":
      return <FaMinusSquare onClick={onClick} className="checkbox-icon" />;
    default:
      return null;
  }
};

type CheckBoxIconProps = {
  variant: "all" | "none" | "some";
  onClick: (event: React.MouseEvent<SVGElement, MouseEvent>) => void;
};

type ArrowIconProps = {
  isOpen: boolean;
  className?: string;
};
