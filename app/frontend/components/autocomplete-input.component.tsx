import React, { useState, useEffect, ChangeEvent, RefObject } from "react";
import LoadingOval from "./loading-oval.component";
import useOutsideClick from "../hooks/useOutsideClick";
import { debounce } from "lodash";

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
  const [isSelection, setIsSelection] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const suggestionsRef = useOutsideClick(() => setShowSuggestions(false));

  useEffect(() => {
    if (!isSelection) {
      debouncedFetchSuggestions(query);
    }
    return () => {
      debouncedFetchSuggestions.cancel();
    };
  }, [query, property]);

  const debouncedFetchSuggestions = debounce(async (query: string) => {
    if (!query || !property) {
      setShowSuggestions(false);
      return;
    }

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
  }, 300);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsSelection(false);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    handleQValueChange(index, suggestion);
    setShowSuggestions(false);
    setQuery(suggestion.label);
    setIsSelection(true);
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
        <ul
          className="SuggestionsList"
          ref={suggestionsRef as RefObject<HTMLUListElement>}
        >
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
