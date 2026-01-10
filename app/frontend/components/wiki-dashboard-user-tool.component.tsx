import React, { useState } from "react";

import toast from "react-hot-toast";
import LoadingOval from "./loading-oval.component";
import ArticlesTable from "./articles-table.component";
import { extractDashboardUsername } from "../utils/search-utils";
import { DashboardUserToolResponse } from "../types/search-tool.type";

export default function WikiDashboardUserTool() {
  const [userInputString, setUserInputString] = useState<string>("");
  const [dashboardDomain, setDashboardDomain] = useState<string>(
    "dashboard.wikiedu.org"
  );
  const [queryResult, setQueryResult] = useState<DashboardUserToolResponse>();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [articleTitles, setArticleTitles] = useState<string[]>([]);
  const [usernames, setUsernames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleUserInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newInputValue = event.target.value;
    setUserInputString(newInputValue);

    if (newInputValue.toLowerCase().includes("outreachdashboard.wmflabs.org")) {
      setDashboardDomain("outreachdashboard.wmflabs.org");
    } else if (newInputValue.toLowerCase().includes("dashboard.wikiedu.org")) {
      setDashboardDomain("dashboard.wikiedu.org");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    setIsLoading(true);
    event.preventDefault();

    if (!userInputString) {
      toast("Please enter a username or profile URL");
      return;
    }
    const user = extractDashboardUsername(userInputString);
    setSelectedUser(user);

    const encodedUser = encodeURIComponent(user);
    try {
      const response = await fetch(
        `https://${dashboardDomain}/users/${encodedUser}/taught_courses_articles.json`
      );
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("User not found");
          return;
        }
        throw new Error("Network response was not ok");
      }
      const data: DashboardUserToolResponse = await response.json();
      setQueryResult(data);

      if (data.user_profiles.length === 0) {
        toast.error("No courses or articles found for this user");
        setArticleTitles([]);
        setUsernames([]);
        return;
      }

      let queriedTitles: string[] = [];
      let queriedUsernames: string[] = [];
      data["user_profiles"].map((course) => {
        queriedTitles.push(
          ...course.articles.map((article) => article.article_title)
        );
        queriedUsernames.push(...course.users.map((user) => user.username));
      });
      setArticleTitles(queriedTitles);
      setUsernames(queriedUsernames);
    } catch (error) {
      toast.error("There was an issue fetching the data.");
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="Container Container--padded">
      <h1>Impact Search</h1>

      <form onSubmit={handleSubmit}>
        <h3>Enter Username or Profile URL</h3>
        <input
          className="PetscanInput"
          type="text"
          value={userInputString}
          onChange={handleUserInputChange}
          placeholder="Username or Profile URL"
          required
        />
        <div className="u-mt1">
          <label htmlFor="dashboardDomainSelect">Select Dashboard:</label>
          <select
            id="dashboardDomainSelect"
            value={dashboardDomain}
            onChange={(e) => setDashboardDomain(e.target.value)}
            required
          >
            <option value="dashboard.wikiedu.org">dashboard.wikiedu.org</option>
            <option value="outreachdashboard.wmflabs.org">
              outreachdashboard.wmflabs.org
            </option>
          </select>
        </div>
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
        <div
          className="TablesContainer"
          style={{ display: "flex", gap: "20px" }}
        >
          {articleTitles && articleTitles.length > 0 && (
            <ArticlesTable
              articles={articleTitles}
              filename={`${selectedUser}-dashboard-articles`}
            />
          )}
          {usernames && usernames.length > 0 && (
            <ArticlesTable
              articles={usernames}
              filename={`${selectedUser}-dashboard-usernames`}
            />
          )}
        </div>
      )}
    </div>
  );
}
