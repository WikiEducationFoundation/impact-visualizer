import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  RefObject,
  ChangeEvent,
  KeyboardEvent,
} from "react";
import { debounce } from "lodash";
import { BsPlusLg } from "react-icons/bs";
import { IoClose } from "react-icons/io5";
import LoadingOval from "./loading-oval.component";
import SuggestionsList, {
  SuggestionsListHandle,
} from "./suggestions-list.component";
import useOutsideClick from "../hooks/useOutsideClick";
import { parseWikiUrlTitle } from "../utils/search-utils";
import { Suggestion } from "../types/search-tool.type";

interface AddArticleModalProps {
  wiki?: { language: string; project: string };
  onAdd: (title: string) => Promise<unknown>;
  adding?: boolean;
  onClose: () => void;
}

const AddArticleModal: React.FC<AddArticleModalProps> = ({
  wiki,
  onAdd,
  adding,
  onClose,
}) => {
  const [query, setQuery] = useState<string>("");
  const [submittedTitle, setSubmittedTitle] = useState<string>("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);

  const suggestionsRef = useOutsideClick(() => setShowSuggestions(false));
  const suggestionsListRef = useRef<SuggestionsListHandle>(null);

  const language = wiki?.language ?? "en";
  const project = wiki?.project ?? "wikipedia";
  const wikiDomain = `${language}.${project}.org`;

  useEffect(() => {
    suggestionsListRef.current?.scrollToSuggestion(activeSuggestion);
  }, [activeSuggestion]);

  const debouncedFetchSuggestions = useMemo(
    () =>
      debounce(async (search: string) => {
        setIsLoading(true);
        try {
          const response = await fetch(
            `https://${wikiDomain}/w/api.php?action=query&list=prefixsearch&pssearch=${encodeURIComponent(
              search,
            )}&pslimit=8&format=json&formatversion=2&origin=*`,
          );
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          const data = await response.json();
          const next: Suggestion[] = (data.query?.prefixsearch ?? []).map(
            (page: { title: string; pageid: number }) => ({
              label: page.title,
              description: "",
              id: String(page.pageid),
            }),
          );
          setSuggestions(next);
          setShowSuggestions(true);
          setActiveSuggestion(-1);
        } catch (error) {
          console.error("Error fetching article suggestions:", error);
          setShowSuggestions(false);
        } finally {
          setIsLoading(false);
        }
      }, 300),
    [wikiDomain],
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (!value.trim() || parseWikiUrlTitle(value)) {
      debouncedFetchSuggestions.cancel();
      setShowSuggestions(false);
      return;
    }
    debouncedFetchSuggestions(value.trim());
  };

  const submitTitle = (title: string) => {
    if (!title || adding) return;
    debouncedFetchSuggestions.cancel();
    setShowSuggestions(false);
    setSubmittedTitle(title);
    onAdd(title)
      .then(() => onClose())
      .catch(() => {});
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setQuery(suggestion.label);
    debouncedFetchSuggestions.cancel();
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        setActiveSuggestion((prev) =>
          prev === suggestions.length - 1 ? 0 : prev + 1,
        );
        break;
      case "ArrowUp":
        setActiveSuggestion((prev) =>
          prev === 0 ? suggestions.length - 1 : prev - 1,
        );
        break;
      case "Enter":
        if (activeSuggestion >= 0 && activeSuggestion < suggestions.length) {
          e.preventDefault();
          handleSuggestionClick(suggestions[activeSuggestion]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  return (
    <div
      className="AddArticleModal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !adding) onClose();
      }}
    >
      <div className="Panel">
        <div className="Header">
          <div className="TitleGroup">
            <BsPlusLg size={18} className="HeaderIcon" />
            <h3 className="Title">Add article to topic</h3>
          </div>
          <button
            type="button"
            className="Close"
            onClick={onClose}
            disabled={adding}
            aria-label="Close add article"
          >
            <IoClose size={24} />
          </button>
        </div>
        <div className="Body">
          <p className="Intro">
            Search {wikiDomain} by article title, or paste a full article URL
            (e.g. https://{wikiDomain}/wiki/...).
          </p>
          <ul className="HowTo">
            <li>
              Adding fetches the article&apos;s statistics from Wikipedia.
              Popular articles with many editors and incoming links can take
              longer to fetch.
            </li>
            <li>
              Once added, the article appears in the chart and the aggregate
              stats update right away.
            </li>
          </ul>
          {adding ? (
            <div className="FetchingState" role="status">
              <LoadingOval visible height="44" width="44" />
              <div className="FetchingText">
                <strong>Adding &ldquo;{submittedTitle}&rdquo;&hellip;</strong>
                <span>Fetching article statistics from Wikipedia.</span>
              </div>
            </div>
          ) : (
            <form
              className="AddArticleForm"
              onSubmit={(e) => {
                e.preventDefault();
                submitTitle(parseWikiUrlTitle(query) ?? query.trim());
              }}
            >
              <input
                type="text"
                className="AddArticleInput"
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Article title or URL"
                aria-label="Article title or URL"
                autoFocus
              />
              <button type="submit" className="AddBtn" disabled={!query.trim()}>
                Add
              </button>
              {showSuggestions && (
                <div
                  className="AddArticleSuggestions"
                  ref={suggestionsRef as RefObject<HTMLDivElement>}
                >
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
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddArticleModal;
