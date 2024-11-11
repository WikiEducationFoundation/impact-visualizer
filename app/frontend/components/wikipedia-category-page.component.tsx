import { FormEvent, useState } from "react";
import { CategoryNode } from "../types/search-tool.type";
import CategoryTree from "./category-tree.component";
import LoadingOval from "./loading-oval.component";
import {
  convertInitialResponseToTree,
  removeCategoryPrefix,
} from "../utils/search-utils";
import { fetchSubcatsAndPages } from "../services/articles.service";
import React from "react";
import toast from "react-hot-toast";
import { BsExclamationCircleFill } from "react-icons/bs";
import { CheckBoxIcon } from "./tree-icons.component";

export default function WikipediaCategoryPage() {
  const [categoryText, setCategoryText] = useState<string>("");
  const [categoryName, setCategoryName] = useState<string>("");
  const [languageCode, setLanguageCode] = useState<string>("");

  const [SubcatsData, setSubcatsData] = useState<CategoryNode>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      let categoryName = decodeURI(categoryText);
      if (categoryText.startsWith("https://")) {
        categoryName = decodeURI(categoryText.split("/").slice(-1)[0]);
      } else if (categoryText.includes(":")) {
        categoryName = `category:${removeCategoryPrefix(categoryName)}`;
      } else {
        categoryName = `category:${categoryName}`;
      }
      const fetchedSubcatsAndPages = await fetchSubcatsAndPages(
        categoryName,
        languageCode
      );
      if (!fetchedSubcatsAndPages) {
        throw new Error("Invalid Response (possibly null)");
      }
      if (fetchedSubcatsAndPages.error) {
        throw new Error(fetchedSubcatsAndPages.error.info);
      }
      setCategoryName(categoryName);

      setSubcatsData(
        convertInitialResponseToTree(
          fetchedSubcatsAndPages,
          [],
          0,
          categoryName
        )
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(
          "Failed to fetch subcategories, Make sure your chosen language code is correct!"
        );
        console.error(error.message);
      } else {
        toast.error("Something went wrong!");
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="Container Container--padded">
      <form onSubmit={(e) => handleSubmit(e)}>
        <h1>Impact Search</h1>
        <p>
          This tool allows users to browse a wikipedia category and all of its
          subcategories. Whenever a category is expanded for the first time, the
          tool will retrieve the data for the subcategories 2 levels down.
        </p>
        <h3>Legend</h3>
        <div>
          <BsExclamationCircleFill color="#71afef" /> Indicates that the given
          category has missing subcategories
        </div>
        <div>
          <CheckBoxIcon onClick={() => {}} variant={"all"} /> Indicates that the
          given category is selected
        </div>
        <div>
          <CheckBoxIcon onClick={() => {}} variant={"some"} /> Indicates that
          the given category is selected, but has unselected subcategories
        </div>
        <div>
          <CheckBoxIcon onClick={() => {}} variant={"none"} /> Indicates that
          the given category is not selected
        </div>
        <br />
        <h3>Enter a category URL or Title, select and browse subcategories</h3>
        <div className="CategorySearch">
          <input
            type="text"
            value={languageCode}
            onChange={(event) => setLanguageCode(event.target.value)}
            placeholder="Language Code"
            required
          />
          <input
            type="text"
            value={categoryText}
            onChange={(event) => setCategoryText(event.target.value)}
            placeholder="Category URL or Title"
            required
          />
        </div>
        <button type="submit" className="Button u-mt1" disabled={isLoading}>
          Run Query
        </button>
      </form>
      {isLoading ? (
        <div className="OvalContainer">
          <LoadingOval visible={isLoading} height="100" width="100" />
        </div>
      ) : SubcatsData ? (
        <CategoryTree
          categoryName={categoryName}
          treeData={SubcatsData}
          languageCode={languageCode}
        />
      ) : (
        ""
      )}
    </div>
  );
}
