import React from "react";
import { convertSPARQLArticlesToCSV } from "../utils/search-utils";
import { SPARQLResponse } from "../types/search-tool.type";
import CSVButton from "./CSV-button.component";

export default function ArticlesTable({
  articles,
}: {
  articles: SPARQLResponse["results"]["bindings"];
}) {
  return (
    <>
      <CSVButton articles={articles} csvConvert={convertSPARQLArticlesToCSV} />
      <table className="articles-table">
        <thead>
          <tr>
            <th>Article</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((item, index) => (
            <tr key={index}>
              <td>
                <a href={item.article.value}>{item.personLabel.value}</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
