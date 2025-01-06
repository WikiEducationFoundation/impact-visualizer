import React, { useState } from "react";
import Select from "react-select";
import toast from "react-hot-toast";

const userSetOptions = [
  { value: "", label: "-- Choose an option --" },
  { value: "wiki-student-program", label: "Wikipedia Student Program" },
  { value: "scholars-and-scientists-program", label: "Scholars & Scientists" },
];

const userSetTypeOptions = [
  { value: "", label: "-- Choose an option --" },
  { value: "students", label: "Students" },
  { value: "instructors", label: "Instructors" },
  { value: "students and instructors", label: "Students and Instructors" },
];

export default function UserSetTool() {
  const [selectedUserSet, setSelectedUserSet] = useState<string>("");
  const [selectedUserSetTypes, setSelectedUserSetTypes] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    setIsLoading(true);
    event.preventDefault();

    if (!selectedUserSet) {
      toast("Please select a user group");
      setIsLoading(false);
      return;
    }

    if (!selectedUserSetTypes) {
      toast("Please select a user type");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  };

  return (
    <div className="Container Container--padded">
      <h1>Impact Search</h1>

      <form onSubmit={handleSubmit}>
        <label>
          <h3>Select User Group</h3>
          <Select
            options={userSetOptions}
            value={userSetOptions.find(
              (option) => option.value === selectedUserSet
            )}
            onChange={(selectedOption) =>
              setSelectedUserSet((selectedOption as any).value)
            }
          />
        </label>

        <label className="u-mt2">
          <h3>Select User Type</h3>
          <Select
            options={userSetTypeOptions}
            value={userSetTypeOptions.find(
              (option) => option.value === selectedUserSetTypes
            )}
            onChange={(selectedOption) =>
              setSelectedUserSetTypes((selectedOption as any).value)
            }
            isDisabled={!selectedUserSet}
          />
        </label>
        <button type="submit" className="Button u-mt2">
          Run Query
        </button>
      </form>
    </div>
  );
}
