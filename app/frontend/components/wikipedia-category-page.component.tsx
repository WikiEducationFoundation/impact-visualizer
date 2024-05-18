import { ChangeEvent, FormEvent, useState } from "react";
import { CategoryNode } from "../types/search-tool.type";
import CategoryTree from "./category-tree.component";
import LoadingOval from "./loading-oval.component";
import { convertInitialResponseToTree } from "../utils/search-utils";
import { fetchSubcatsAndPages } from "../services/articles.service";
import React from "react";
import toast from "react-hot-toast";

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
      let categoryName = categoryURL;
      if (categoryURL.startsWith("https://")) {
        categoryName = categoryURL.split("/").slice(-1)[0];
      } else if (!categoryURL.toUpperCase().startsWith("CATEGORY:")) {
        categoryName = "Category:" + categoryURL;
      }
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
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error("Failed to fetch subcategories");
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
