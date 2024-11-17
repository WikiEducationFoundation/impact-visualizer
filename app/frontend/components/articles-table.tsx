import React from "react";
import { convertArticlesToCSV } from "../utils/search-utils";
import CSVButton from "./CSV-button.component";

export default function ArticlesTable({
  articles,
  filename,
}: {
  articles: string[];
  filename: string;
}) {
  const hasArticles = articles.length > 0;
  return (
    <table>
      <thead>
        <tr>
          <th>
            Article
            {hasArticles ? (
              <CSVButton
                articles={articles}
                csvConvert={convertArticlesToCSV}
                filename={filename}
              />
            ) : null}
          </th>
        </tr>
      </thead>
      <tbody>
        {hasArticles ? (
          articles?.map((article, index) => (
            <tr key={index}>
              <td>
                <div>{article}</div>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td>No articles found</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
