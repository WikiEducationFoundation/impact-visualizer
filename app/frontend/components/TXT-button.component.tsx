import React from "react";
import { convertTitlesToWikicode, downloadAsTXT } from "../utils/search-utils";

interface TXTButtonProps {
  articles: string[];
  filename: string;
}
export default function TXTButton({ articles, filename }: TXTButtonProps) {
  const handleExportTXT = () => {
    downloadAsTXT(convertTitlesToWikicode(articles), filename);
  };
  return (
    <button onClick={handleExportTXT} className="Button">
      Export to Wikicode
    </button>
  );
}
