import React, { useState } from "react";
import { PagePileResponse } from "../types/search-tool.type";
import toast from "react-hot-toast";
import LoadingOval from "./loading-oval.component";
import ArticlesTable from "./articles-table.component";

export default function PagePileTool() {
  const [pagePileID, setPagePileID] = useState<string>("");
  const [queryResult, setQueryResult] = useState<PagePileResponse>();
  const [articleTitles, setArticleTitles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    setIsLoading(true);
    event.preventDefault();

    if (!pagePileID) {
      toast("Please enter a PagePile ID.");
      return;
    }

    try {
      const response = await fetch(
        `https://pagepile.toolforge.org/api.php?id=${pagePileID}&action=get_data&format=json`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data: PagePileResponse = await response.json();
      setQueryResult(data);

      const titles = data.pages;
      setArticleTitles(titles);
    } catch (error) {
      console.error("Fetch error:", error);
      toast("There was an issue fetching the data.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="Container Container--padded">
      <h1>Impact Search</h1>

      <form onSubmit={handleSubmit}>
        <h3>Enter PagePile ID</h3>
        <input
          className="PetscanInput"
          type="text"
          value={pagePileID}
          onChange={(event) => setPagePileID(event.target.value)}
          placeholder="PagePile ID"
          required
        />

        <div>
          <button type="submit" className="Button u-mt2">
            Run Query
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="OvalContainer">
          <LoadingOval visible={isLoading} height="120" width="120" />
        </div>
      ) : (
        <div
          className="TablesContainer"
          style={{ display: "flex", gap: "20px" }}
        >
          {queryResult && (
            <ArticlesTable
              articles={articleTitles}
              filename={`${pagePileID}-pagepile-articles`}
            />
          )}
        </div>
      )}
    </div>
  );
}
