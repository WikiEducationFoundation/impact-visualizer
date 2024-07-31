import { FormEvent, useState } from "react";
import {
  QueryProperty,
  SPARQLResponse,
  Suggestion,
} from "../types/search-tool.type";
import QueryItem from "./query-item.component";
import { buildWikidataQuery } from "../utils/search-utils";
import ArticlesTable from "./articles-table.component";
import LoadingOval from "./loading-oval.component";
import React from "react";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";

export default function QueryBuilder() {
  const [queryItemsData, setQueryItemsData] = useState<QueryProperty[]>([
    { key: uuidv4(), property: "", qValue: { id: "", label: "" } },
  ]);
  const [articles, setArticles] = useState<
    {
      article: {
        type: string;
        value: string;
      };
      personLabel: {
        "xml:lang": string;
        type: string;
        value: string;
      };
    }[]
  >([]);
  const [languageCode, setLanguageCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleAddQueryItem = () => {
    if (queryItemsData.length < 5) {
      setQueryItemsData([
        ...queryItemsData,
        { key: uuidv4(), property: "", qValue: { id: "", label: "" } },
      ]);
    }
  };

  const handleRemoveQueryItem = (indexToRemove: number) => {
    if (queryItemsData.length > 1) {
      const updatedProperties = queryItemsData.filter(
        (_, idx) => idx !== indexToRemove
      );
      setQueryItemsData(updatedProperties);
    }
  };

  const handlePropertyChange = (index: number, value: string) => {
    const updatedProperties = [...queryItemsData];
    updatedProperties[index]["property"] = value;
    setQueryItemsData(updatedProperties);
  };

  const handleQValueChange = (index: number, value: Suggestion) => {
    const updatedProperties = [...queryItemsData];
    updatedProperties[index]["qValue"].id = value.id;
    updatedProperties[index]["qValue"].label = value.label;
    setQueryItemsData(updatedProperties);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fetchedArticles = await fetchArticlesByQuery();
    setArticles(fetchedArticles.results.bindings);
  };

  async function fetchArticlesByQuery(): Promise<SPARQLResponse> {
    setIsLoading(true);
    let queriedArticlesJSON: SPARQLResponse;

    const gender = queryItemsData.filter((item) => item.property === "gender");
    const ethnicity = queryItemsData.filter(
      (item) => item.property === "ethnicity"
    );
    const occupations = queryItemsData.filter(
      (item) => item.property === "occupation"
    );

    const query: string = buildWikidataQuery(
      occupations.map((occupation) => occupation.qValue.id),
      gender.length > 0 ? gender[0].qValue.id : "",
      ethnicity.length > 0 ? ethnicity[0].qValue.id : ""
    );
    try {
      const response = await fetch(
        `https://query.wikidata.org/sparql?query=${query}&format=json`,
        {
          headers: {
            Accept: "application/sparql-results+json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Network response was not ok.");
      }
      queriedArticlesJSON = await response.json();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Error fetching articles`);
        console.error(error.message);
      } else {
        toast.error(`Something went wrong!`);
      }
      queriedArticlesJSON = { head: { vars: [] }, results: { bindings: [] } };
    }

    setIsLoading(false);

    return queriedArticlesJSON;
  }
  return (
    <div className="Container Container--padded">
      <div className="BuilderHeader">
        <h1>Impact Search</h1>
        <input
          type="text"
          value={languageCode}
          onChange={(event) => setLanguageCode(event.target.value)}
          placeholder="Language Code"
          required
        />
      </div>

      <form onSubmit={(e) => handleSubmit(e)}>
        <h3>Select Properties</h3>

        {queryItemsData.map((item, index) => (
          <QueryItem
            handlePropertyChange={handlePropertyChange}
            handleQValueChange={handleQValueChange}
            handleRemoveQueryItem={handleRemoveQueryItem}
            index={index}
            key={item.key}
            queryItemsData={queryItemsData}
            languageCode={languageCode}
          />
        ))}
        {queryItemsData.length < 5 && (
          <button
            type="button"
            className="AddButton u-mt1"
            onClick={handleAddQueryItem}
          >
            +
          </button>
        )}
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
      ) : articles.length > 0 ? (
        <ArticlesTable articles={articles} />
      ) : (
        ""
      )}
    </div>
  );
}
