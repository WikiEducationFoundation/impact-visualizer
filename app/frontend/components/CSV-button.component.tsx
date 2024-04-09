import React from "react";
import { downloadAsCSV } from "../utils/search-utils";

interface CSVButtonProps<T> {
  articles: T;
  csvConvert: (articles: T) => string;
}
export default function CSVButton<T>({
  articles,
  csvConvert,
}: CSVButtonProps<T>) {
  const handleExportCSV = () => {
    const csvContent = csvConvert(articles);
    downloadAsCSV(csvContent);
  };
  return (
    <button onClick={handleExportCSV} className="Button">
      Export to CSV
    </button>
  );
}
