import React, {
  RefObject,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Suggestion } from "../types/search-tool.type";

const SuggestionsList = forwardRef(
  (
    {
      suggestions,
      activeSuggestion,
      handleSuggestionClick,
      isLoading,
      LoadingOval,
    }: SuggestionsListProps,
    ref: React.Ref<SuggestionsListHandle>
  ) => {
    const suggestionsRef = useRef<HTMLUListElement>(null);
    const suggestionItemsRef = useRef<(HTMLLIElement | null)[]>([]);

    useImperativeHandle(ref, () => ({
      scrollToSuggestion: (index: number) => {
        const suggestionItem = suggestionItemsRef.current[index];
        if (suggestionItem && suggestionsRef.current) {
          const itemOffsetTop = suggestionItem.offsetTop;
          const itemOffsetHeight = suggestionItem.offsetHeight;
          const containerScrollTop = suggestionsRef.current.scrollTop;
          const containerOffsetHeight = suggestionsRef.current.offsetHeight;

          if (itemOffsetTop < containerScrollTop) {
            suggestionsRef.current.scrollTop = itemOffsetTop;
          } else if (
            itemOffsetTop + itemOffsetHeight >
            containerScrollTop + containerOffsetHeight
          ) {
            suggestionsRef.current.scrollTop =
              itemOffsetTop + itemOffsetHeight - containerOffsetHeight;
          }
        }
      },
    }));

    return (
      <ul
        className="SuggestionsList"
        ref={suggestionsRef as RefObject<HTMLUListElement>}
        tabIndex={0}
      >
        {isLoading ? (
          <div className="u-mb1">
            <LoadingOval visible={isLoading} height="100" width="100" />
          </div>
        ) : suggestions.length > 0 ? (
          suggestions.map((suggestion, i) => (
            <li
              key={i}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`SuggestionItem ${
                activeSuggestion === i ? "active" : ""
              }`}
              ref={(el) => (suggestionItemsRef.current[i] = el)}
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
    );
  }
);

type SuggestionsListProps = {
  suggestions: Suggestion[];
  activeSuggestion: number;
  setActiveSuggestion: React.Dispatch<React.SetStateAction<number>>;
  handleSuggestionClick: (suggestion: Suggestion) => void;
  isLoading: boolean;
  LoadingOval: any;
};

export type SuggestionsListHandle = {
  scrollToSuggestion: (index: number) => void;
};

export default SuggestionsList;
