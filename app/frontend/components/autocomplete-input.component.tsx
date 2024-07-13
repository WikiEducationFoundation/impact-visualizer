import React, { useState, useEffect, ChangeEvent } from "react";
import LoadingOval from "./loading-oval.component";

const AutocompleteInput = ({
  index,
  property,
  handleQValueChange,
}: {
  index: number;
  property: string;
  handleQValueChange: (index: number, value: Suggestion) => void;
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [query, setQuery] = useState<string>("");
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [debouncedValue, setDebouncedValue] = useState<string>(query);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(query);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  useEffect(() => {
    if (debouncedValue && property) {
      fetchSuggestions();
    } else {
      setShowSuggestions(false);
    }
  }, [debouncedValue, property]);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${query}&language=en&uselang=en&type=item&format=json&formatversion=2&errorformat=plaintext&origin=*&limit=12`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      const suggestions = data.search.map((item) => ({
        label: item.display.label.value,
        description: item.display.description
          ? item.display.description.value
          : "No description found",
        id: item.id,
      }));

      setSuggestions(suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    handleQValueChange(index, suggestion);
    setQuery(suggestion.label);
    setShowSuggestions(false);
  };

  return (
    <div className="Autocomplete">
      <input
        type="text"
        className="AutocompleteInput"
        value={query}
        onChange={handleInputChange}
        placeholder="Enter a Value"
        disabled={!property}
        required
      />

      {showSuggestions && (
        <ul className="SuggestionsList">
          {isLoading ? (
            <div className=" u-mb1">
              <LoadingOval visible={isLoading} height="100" width="100" />
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion, i) => (
              <li
                key={i}
                onClick={() => handleSuggestionClick(suggestion)}
                className="SuggestionItem"
              >
                <div className="SuggestionLabel">{suggestion.label}</div>
                <div className="SuggestionDescription">
                  {suggestion.description}
                </div>
              </li>
            ))
          ) : (
            <li className="NoSuggestionsItem">No suggestions found</li>
          )}
        </ul>
      )}
    </div>
  );
};

type Suggestion = {
  label: string;
  description: string;
  id: string;
};

export default AutocompleteInput;
