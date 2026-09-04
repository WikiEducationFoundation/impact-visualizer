import React, { RefObject, useMemo, useState } from "react";
import { List } from "react-window";
import { FaChevronDown, FaChevronUp } from "react-icons/fa6";
import useOutsideClick from "../hooks/useOutsideClick";

const ITEM_HEIGHT = 34;
const LIST_HEIGHT = 300;

interface PickerRowProps {
  titles: string[];
  selected: Set<string>;
  onToggle: (title: string) => void;
}

function PickerRow(props: PickerRowProps): React.ReactElement | null {
  const { titles, selected, onToggle } = props;
  const { index, style } = props as unknown as {
    index: number;
    style: React.CSSProperties;
  };
  const title = titles[index];
  if (!title) return null;

  return (
    <label style={style} className="PickerItem" title={title}>
      <input
        type="checkbox"
        checked={selected.has(title)}
        onChange={() => onToggle(title)}
      />
      <span className="PickerItemLabel">{title}</span>
    </label>
  );
}

export interface TimeTravelArticlePickerProps {
  articleTitles: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

const TimeTravelArticlePicker: React.FC<TimeTravelArticlePickerProps> = ({
  articleTitles,
  selected,
  onChange,
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const containerRef = useOutsideClick(() => setOpen(false));

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return articleTitles;
    return articleTitles.filter((title) => title.toLowerCase().includes(term));
  }, [articleTitles, search]);

  const toggle = (title: string) => {
    if (selectedSet.has(title)) {
      onChange(selected.filter((t) => t !== title));
    } else {
      onChange([...selected, title]);
    }
  };

  const unselectedInList = filtered.filter((title) => !selectedSet.has(title));
  const selectAll = () => onChange([...selected, ...unselectedInList]);

  return (
    <div
      className="TimeTravelPicker"
      ref={containerRef as RefObject<HTMLDivElement>}
    >
      <button
        type="button"
        className="PickerTrigger"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>
          Articles ({selected.length} of {articleTitles.length})
        </span>
        {open ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
      </button>

      {open && (
        <div className="PickerPopover">
          <input
            className="PickerSearch"
            type="text"
            value={search}
            placeholder="Search articles"
            onChange={(e) => setSearch(e.target.value)}
          />
          {filtered.length === 0 ? (
            <div className="PickerEmpty">No matching articles</div>
          ) : (
            <List
              className="PickerList"
              rowComponent={PickerRow}
              rowCount={filtered.length}
              rowHeight={ITEM_HEIGHT}
              rowProps={{
                titles: filtered,
                selected: selectedSet,
                onToggle: toggle,
              }}
              overscanCount={10}
              style={{ maxHeight: LIST_HEIGHT }}
            />
          )}
          <div className="PickerFooter">
            <span>
              {selected.length} of {articleTitles.length} selected
            </span>
            <div className="PickerActions">
              {unselectedInList.length > 0 && (
                <button type="button" className="ResetLink" onClick={selectAll}>
                  {search.trim() ? "Select all matching" : "Select all"}
                </button>
              )}
              {selected.length > 0 && (
                <button
                  type="button"
                  className="ResetLink"
                  onClick={() => onChange([])}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeTravelArticlePicker;
