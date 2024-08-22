import React, { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import LoadingOval from "./loading-oval.component";

export default function WikiDashboardTool() {
  const [courseURL, setCourseURL] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usersData, setUsersData] = useState("");
  const [articlesData, setArticlesData] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    setIsLoading(true);
    event.preventDefault();
    try {
      let [usersResponse, articlesResponse] = await Promise.allSettled([
        fetch(`${courseURL}/users.json`),
        fetch(`${courseURL}/articles.json`),
      ]);

      if (usersResponse.status === "rejected" || !usersResponse.value.ok) {
        toast("Failed to fetch users data.");
        throw new Error("Failed to fetch users data.");
      }

      if (
        articlesResponse.status === "rejected" ||
        !articlesResponse.value.ok
      ) {
        toast("Failed to fetch articles data.");
        throw new Error("Failed to fetch articles data.");
      }

      const usersData = await usersResponse.value.json();
      const articlesData = await articlesResponse.value.json();
      console.log(usersData, articlesData);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Error fetching data`);
        console.error(error.message);
      } else {
        toast.error(`Something went wrong!`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="Container Container--padded">
      <h1>Impact Search</h1>

      <form onSubmit={handleSubmit}>
        <h3>Enter Course URL</h3>
        <input
          className="WikiDashboardInput"
          type="text"
          value={courseURL}
          onChange={(event) => setCourseURL(event.target.value)}
          placeholder="Course URL"
          required
        />

        <div>
          <button type="submit" className="Button u-mt2">
            Run Query
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="OvalContainer">
          <LoadingOval visible={isLoading} height="120" width="120" />
        </div>
      ) : (
        ""
      )}
    </div>
  );
}
