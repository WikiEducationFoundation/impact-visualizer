import React, { useState, useEffect } from "react";
import LoadingOval from "./loading-oval.component";

const AutocompleteInput = ({ qValue, property, onValueChange }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedValue, setDebouncedValue] = useState(qValue);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(qValue);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [qValue]);

  useEffect(() => {
    if (debouncedValue && property) {
      fetchSuggestions(debouncedValue);
    } else {
      setShowSuggestions(false);
    }
  }, [debouncedValue, property]);

  const fetchSuggestions = async (query) => {
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

  const handleInputChange = (e) => {
    onValueChange(e.target.value);
  };

  const handleSuggestionClick = (value) => {
    onValueChange(value);
    setShowSuggestions(false);
  };

  return (
    <div className="Autocomplete">
      <input
        type="text"
        value={qValue}
        onChange={handleInputChange}
        placeholder="Enter a Value"
        required
        className="AutocompleteInput"
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

export default AutocompleteInput;
