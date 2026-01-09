import React from "react";
import { convertArticlesToCSV } from "../utils/search-utils";
import CSVButton from "./CSV-button.component";
import usePagination from "../hooks/usePagination";
import TXTButton from "./TXT-button.component";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";

export default function ArticlesTable({
  articles,
  filename,
  headerTitle = "Article",
}: {
  articles: string[];
  filename: string;
  headerTitle?: string;
}) {
  const {
    currentPageData,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
  } = usePagination<string>({
    data: articles,
    itemsPerPage: 15,
    initialPage: 1,
  });

  const hasArticles = articles.length > 0;
  return (
    <>
      <table>
        <thead>
          <tr>
            <th>
              {headerTitle}
              {hasArticles ? (
                <div>
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className="IconButton"
                  >
                    <IoIosArrowBack className="icon" />
                  </button>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className="IconButton"
                  >
                    <IoIosArrowForward className="icon" />
                  </button>
                  <CSVButton
                    articles={articles}
                    csvConvert={convertArticlesToCSV}
                    filename={filename}
                  />
                  <TXTButton articles={articles} filename={filename} />
                </div>
              ) : null}
            </th>
          </tr>
        </thead>
        <tbody>
          {hasArticles ? (
            currentPageData?.map((article, index) => (
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
    </>
  );
}
