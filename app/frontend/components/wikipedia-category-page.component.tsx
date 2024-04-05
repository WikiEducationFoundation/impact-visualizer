import { ChangeEvent, FormEvent, useState } from "react";
import { CategoryNode } from "../types/search-tool.type";
import CategoryTree from "./category-tree.component";
import LoadingOval from "./loading-oval.component";
import { convertInitialResponseToTree } from "../utils/search-utils";
import { fetchSubcatsAndPages } from "../services/articles.service";
import React from "react";

export default function WikipediaCategoryPage() {
  const [categoryURL, setCategoryURL] = useState<string>("");
  const [SubcatsData, setSubcatsData] = useState<CategoryNode>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCategoryURL(event.target.value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const categoryName = categoryURL.split("/").slice(-1)[0];
      const fetchedSubcatsAndPages = await fetchSubcatsAndPages(categoryName);
      if (!fetchedSubcatsAndPages) {
        throw new Error("Invalid Response (possibly null)");
      }
      if (fetchedSubcatsAndPages.error) {
        throw new Error(fetchedSubcatsAndPages.error.info);
      }
      setSubcatsData(
        convertInitialResponseToTree(
          fetchedSubcatsAndPages,
          [],
          0,
          categoryName
        )
      );
    } catch (error) {
      console.error(error);
    }

    setIsLoading(false);
  };

  return (
    <div className="Container Container--padded">
      <form onSubmit={(e) => handleSubmit(e)}>
        <h1>Impact Search</h1>
        <h3>Enter a category URL, select and browse subcategories</h3>

        <input
          type="text"
          value={categoryURL}
          onChange={handleChange}
          placeholder="Enter a Category URL"
          required
        />
        <button type="submit" className="Button u-mt1" disabled={isLoading}>
          Run Query
        </button>
      </form>
      {isLoading ? (
        <div className="OvalContainer">
          <LoadingOval visible={isLoading} />
        </div>
      ) : SubcatsData ? (
        <CategoryTree treeData={SubcatsData} />
      ) : (
        ""
      )}
    </div>
  );
}
