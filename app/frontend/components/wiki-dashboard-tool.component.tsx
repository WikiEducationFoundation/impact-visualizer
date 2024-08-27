import React, { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import LoadingOval from "./loading-oval.component";
import {
  CourseArticlesResponse,
  CourseUsersResponse,
} from "../types/search-tool.type";
import CSVButton from "./CSV-button.component";
import { convertDashboardDataToCSV } from "../utils/search-utils";

export default function WikiDashboardTool() {
  const [courseURL, setCourseURL] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usernames, setUsernames] = useState<string[]>();
  const [articleTitles, setArticleTitles] = useState<string[]>();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    setIsLoading(true);
    event.preventDefault();
    try {
      let [usersResponse, articlesResponse] = await Promise.allSettled([
        fetch(`${courseURL}/users.json`),
        fetch(`${courseURL}/articles.json`),
      ]);

      if (usersResponse.status === "rejected" || !usersResponse.value.ok) {
        throw new Error("Failed to fetch users data.");
      }

      if (
        articlesResponse.status === "rejected" ||
        !articlesResponse.value.ok
      ) {
        throw new Error("Failed to fetch articles data.");
      }

      const usersResponseData: CourseUsersResponse =
        await usersResponse.value.json();

      const articlesResponseData: CourseArticlesResponse =
        await articlesResponse.value.json();

      const usernames = usersResponseData.course.users.map(
        (user) => user.username
      );

      const articleTitles = articlesResponseData.course.articles.map(
        (article) => article.title
      );

      setUsernames(usernames);
      setArticleTitles(articleTitles);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
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
        <div
          className="TablesContainer"
          style={{ display: "flex", gap: "20px" }}
        >
          {articleTitles && (
            <table>
              <thead>
                <tr>
                  <th>
                    Article
                    <CSVButton
                      articles={articleTitles}
                      csvConvert={convertDashboardDataToCSV}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {articleTitles?.map((article, index) => (
                  <tr key={index}>
                    <td>
                      <div>{article}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {usernames && (
            <table>
              <thead>
                <tr>
                  <th>
                    User
                    <CSVButton
                      articles={usernames}
                      csvConvert={convertDashboardDataToCSV}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {usernames?.map((username, index) => (
                  <tr key={index}>
                    <td>
                      <div>{username}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
