import React, { useState, useEffect } from "react";

const AutocompleteInput = ({ qValue, property, onValueChange }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedValue, setDebouncedValue] = useState(qValue);

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
    try {
      const response = await fetch(
        `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${query}&language=en&uselang=en&type=item&format=json&formatversion=2&errorformat=plaintext&origin=*&limit=12`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      const labels = data.search.map((item) => item.display.label.value);

      setSuggestions(labels);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setShowSuggestions(false);
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
          {suggestions.map((suggestion, i) => (
            <li
              key={i}
              onClick={() => handleSuggestionClick(suggestion)}
              className="SuggestionItem"
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AutocompleteInput;
