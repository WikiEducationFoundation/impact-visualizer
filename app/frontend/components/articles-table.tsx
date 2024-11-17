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
  return (
    <table>
      <thead>
        <tr>
          <th>
            Article
            <CSVButton
              articles={articles}
              csvConvert={convertArticlesToCSV}
              filename={filename}
            />
          </th>
        </tr>
      </thead>
      <tbody>
        {articles?.map((article, index) => (
          <tr key={index}>
            <td>
              <div>{article}</div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
