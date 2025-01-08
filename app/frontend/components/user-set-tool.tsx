import React, { useState } from "react";
import Select from "react-select";
import toast from "react-hot-toast";
import { UserSetResponse } from "../types/search-tool.type";
import LoadingOval from "./loading-oval.component";
import ArticlesTable from "./articles-table";

const userSetOptions = [
  { value: "", label: "-- Choose an option --" },
  { value: "classroom_program", label: "Wikipedia Student Program" },
  { value: "fellows_cohort", label: "Scholars & Scientists" },
];

const userSetTypeOptions = [
  { value: "", label: "-- Choose an option --" },
  { value: "students", label: "Students" },
  { value: "students_and_instructors", label: "Students and Instructors" },
];

export default function UserSetTool() {
  const [selectedUserSet, setSelectedUserSet] = useState<string>("");
  const [selectedUserSetTypes, setSelectedUserSetTypes] = useState<string>("");
  const [queriedData, setQueriedData] = useState<UserSetResponse>();
  const [queriedUsers, setQueriedUsers] = useState<string[]>([]);
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
    if (selectedUserSet === "wiki-student-program") {
    }
    try {
      const response = await fetch(
        `https://dashboard.wikiedu.org/courses/${[
          selectedUserSet,
          selectedUserSetTypes,
        ].join("_")}.json`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data: UserSetResponse = await response.json();
      setQueriedData(data);

      const usernames: string[] = [];

      data.courses.forEach((course) => {
        course.students.forEach((student) => {
          usernames.push(student.username);
        });
        if (course.instructors) {
          course.instructors.forEach((instructor) => {
            usernames.push(instructor.username);
          });
        }
      });
      setQueriedUsers(usernames);
    } catch (error) {
      console.error("Fetch error:", error);
      toast("There was an issue fetching the data.");
    } finally {
      setIsLoading(false);
    }
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
      {isLoading ? (
        <div className="OvalContainer">
          <LoadingOval visible={isLoading} height="120" width="120" />
        </div>
      ) : (
        <div
          className="TablesContainer"
          style={{ display: "flex", gap: "20px" }}
        >
          {queriedData && (
            <ArticlesTable
              articles={queriedUsers}
              filename={`${selectedUserSet.replace(
                "_",
                "-"
              )}_${selectedUserSetTypes.replace("_", "-")}.csv`}
            />
          )}
        </div>
      )}
    </div>
  );
}
