import React, { useState } from "react";
import { PetscanResponse } from "../types/search-tool.type";
import toast from "react-hot-toast";
import LoadingOval from "./loading-oval.component";
import ArticlesTable from "./articles-table.component";

export default function PetScanTool() {
  const [petscanID, setPetscanID] = useState<string>("");
  const [queryResult, setQueryResult] = useState<PetscanResponse>();
  const [articleTitles, setArticleTitles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    setIsLoading(true);
    event.preventDefault();

    if (!petscanID) {
      toast("Please enter a PetScan ID.");
      return;
    }

    try {
      const response = await fetch(
        `https://petscan.wmcloud.org/?psid=${petscanID}&format=json`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data: PetscanResponse = await response.json();
      const titles = data["*"][0].a["*"].map((page) => page.title);

      if (titles.length === 0) {
        toast.error("No articles found for this PetScan ID.");
        setQueryResult(undefined);
        setArticleTitles([]);
      } else {
        setQueryResult(data);
        setArticleTitles(titles);
      }
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
        <h3>Enter PetScan ID</h3>
        <input
          className="PetscanInput"
          type="text"
          value={petscanID}
          onChange={(event) => setPetscanID(event.target.value)}
          placeholder="PetScan ID"
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
              filename={`${petscanID}-petscan-articles`}
            />
          )}
        </div>
      )}
    </div>
  );
}
