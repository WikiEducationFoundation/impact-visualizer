import React from "react";
import { downloadAsCSV } from "../utils/search-utils";

interface CSVButtonProps<T> {
  articles: T;
  csvConvert: (articles: T) => string;
  filename: string;
}
export default function CSVButton<T>({
  articles,
  csvConvert,
  filename,
}: CSVButtonProps<T>) {
  const handleExportCSV = () => {
    const csvContent = csvConvert(articles);
    downloadAsCSV(csvContent, filename);
  };
  return (
    <button onClick={handleExportCSV} className="Button">
      Export to CSV
    </button>
  );
}
