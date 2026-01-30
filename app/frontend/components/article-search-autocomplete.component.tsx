import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  KeyboardEvent,
  RefObject,
} from "react";
import useOutsideClick from "../hooks/useOutsideClick";

interface ArticleSearchAutocompleteProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  articleTitles: string[];
}

const ArticleSearchAutocomplete: React.FC<ArticleSearchAutocompleteProps> = ({
  searchTerm,
  onSearchChange,
  articleTitles,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const suggestionsRef = useOutsideClick(() => setShowSuggestions(false));
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const suggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lowerSearch = searchTerm.toLowerCase();
    return articleTitles
      .filter((title) => title.toLowerCase().includes(lowerSearch))
      .slice(0, 10);
  }, [searchTerm, articleTitles]);

  useEffect(() => {
    const item = itemRefs.current[activeSuggestion];
    if (item && listRef.current) {
      const itemTop = item.offsetTop;
      const itemHeight = item.offsetHeight;
      const containerTop = listRef.current.scrollTop;
      const containerHeight = listRef.current.offsetHeight;
      if (itemTop < containerTop) {
        listRef.current.scrollTop = itemTop;
      } else if (itemTop + itemHeight > containerTop + containerHeight) {
        listRef.current.scrollTop = itemTop + itemHeight - containerHeight;
      }
    }
  }, [activeSuggestion]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || !suggestions.length) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveSuggestion((prev) =>
          prev >= suggestions.length - 1 ? 0 : prev + 1,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveSuggestion((prev) =>
          prev <= 0 ? suggestions.length - 1 : prev - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (activeSuggestion >= 0 && activeSuggestion < suggestions.length) {
          onSearchChange(suggestions[activeSuggestion]);
          setShowSuggestions(false);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  const handleInputChange = (value: string) => {
    onSearchChange(value);
    setShowSuggestions(true);
    setActiveSuggestion(-1);
  };

  const handleSuggestionClick = (title: string) => {
    onSearchChange(title);
    setShowSuggestions(false);
  };

  return (
    <>
      <div className="BoxTitle">Search</div>
      <div
        className="ArticleSearchAutocompleteWrapper"
        ref={suggestionsRef as RefObject<HTMLDivElement>}
      >
        <input
          type="search"
          className="ArticleSearchAutocompleteInput"
          placeholder="Type article name..."
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => searchTerm.trim() && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="ArticleSearchAutocompleteList" ref={listRef}>
            {suggestions.map((title, i) => (
              <li
                key={title}
                ref={(el) => (itemRefs.current[i] = el)}
                className={`ArticleSearchAutocompleteItem ${
                  activeSuggestion === i ? "is-active" : ""
                }`}
                onClick={() => handleSuggestionClick(title)}
                onMouseEnter={() => setActiveSuggestion(i)}
              >
                {title}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default ArticleSearchAutocomplete;
