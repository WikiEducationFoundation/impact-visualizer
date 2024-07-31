import React from "react";
import { BiSolidTrashAlt } from "react-icons/bi";
import AutocompleteInput from "./autocomplete-input.component";
import { QueryProperty, Suggestion } from "../types/search-tool.type";

export default function QueryItem({
  handlePropertyChange,
  handleQValueChange,
  queryItemsData,
  handleRemoveQueryItem,
  index,
  languageCode,
}: QueryItemProps) {
  const property = queryItemsData[index].property;
  return (
    <div className="Box QueryItem u-mt1">
      <select
        onChange={(e) => handlePropertyChange(index, e.target.value)}
        value={property}
        required
      >
        <option value="">--Please choose a property--</option>
        <option value="gender">Gender</option>
        <option value="ethnicity">Ethnicity</option>
        <option value="occupation">Occupation</option>
      </select>
      <AutocompleteInput
        index={index}
        property={property}
        handleQValueChange={handleQValueChange}
        languageCode={languageCode}
      />

      {queryItemsData.length > 1 && (
        <div
          className="RemoveIcon"
          onClick={() => handleRemoveQueryItem(index)}
        >
          <BiSolidTrashAlt size={28} />
        </div>
      )}
    </div>
  );
}

type QueryItemProps = {
  handlePropertyChange: (index: number, value: string) => void;
  handleQValueChange: (index: number, value: Suggestion) => void;
  queryItemsData: QueryProperty[];
  handleRemoveQueryItem: (index: number) => void;
  index: number;
  languageCode: string;
};
