import React, {
  useState,
  useEffect,
  ChangeEvent,
  RefObject,
  KeyboardEvent,
  useRef,
} from "react";
import LoadingOval from "./loading-oval.component";
import useOutsideClick from "../hooks/useOutsideClick";

import { debounce } from "lodash";
import SuggestionsList, {
  SuggestionsListHandle,
} from "./suggestions-list.component";

const AutocompleteInput = ({
  index,
  property,
  handleQValueChange,
  languageCode,
}: {
  index: number;
  property: string;
  handleQValueChange: (index: number, value: Suggestion) => void;
  languageCode: string;
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [query, setQuery] = useState<string>("");
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isSelection, setIsSelection] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);

  const suggestionsRef = useOutsideClick(() => setShowSuggestions(false));
  const suggestionsListRef = useRef<SuggestionsListHandle>(null);

  useEffect(() => {
    if (!isSelection) {
      debouncedFetchSuggestions(query);
    }
    return () => {
      debouncedFetchSuggestions.cancel();
    };
  }, [query, property]);

  useEffect(() => {
    suggestionsListRef.current?.scrollToSuggestion(activeSuggestion);
  }, [activeSuggestion]);

  const debouncedFetchSuggestions = debounce(async (query: string) => {
    if (!query || !property) {
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${query}&language=${languageCode}&uselang=${languageCode}&type=item&format=json&formatversion=2&errorformat=plaintext&origin=*&limit=12`
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
      setActiveSuggestion(-1);
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

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        setActiveSuggestion((prev) =>
          prev === suggestions.length - 1 ? 0 : prev + 1
        );
        break;
      case "ArrowUp":
        setActiveSuggestion((prev) =>
          prev === 0 ? suggestions.length - 1 : prev - 1
        );

        break;
      case "Enter":
        e.preventDefault();
        if (activeSuggestion >= 0 && activeSuggestion < suggestions.length) {
          handleSuggestionClick(suggestions[activeSuggestion]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  return (
    <div className="Autocomplete">
      <input
        type="text"
        className="AutocompleteInput"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Enter a Value"
        disabled={!property}
        required
      />

      {showSuggestions && (
        <div ref={suggestionsRef as RefObject<HTMLDivElement>}>
          <SuggestionsList
            ref={suggestionsListRef}
            suggestions={suggestions}
            activeSuggestion={activeSuggestion}
            setActiveSuggestion={setActiveSuggestion}
            handleSuggestionClick={handleSuggestionClick}
            isLoading={isLoading}
            LoadingOval={LoadingOval}
          />
        </div>
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
