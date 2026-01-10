import React, { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import LoadingOval from "./loading-oval.component";
import {
  CampaignArticlesResponse,
  CampaignUsersResponse,
  CourseArticlesResponse,
  CourseUsersResponse,
} from "../types/search-tool.type";
import { extractDashboardURLInfo } from "../utils/search-utils";
import ArticlesTable from "./articles-table.component";

export default function WikiDashboardCourseTool() {
  const [courseURL, setCourseURL] = useState("");
  const [courseSlug, setCourseSlug] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usernames, setUsernames] = useState<string[]>();
  const [articleTitles, setArticleTitles] = useState<string[]>();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    setIsLoading(true);
    event.preventDefault();
    try {
      let { dashboardURL, type, slug } = extractDashboardURLInfo(courseURL);

      let [usersResponse, articlesResponse] = await Promise.allSettled([
        fetch(`${dashboardURL}/users.json`),
        fetch(`${dashboardURL}/articles.json`),
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

      let usernames;
      let articleTitles;

      if (type === "course") {
        const usersResponseData: CourseUsersResponse =
          await usersResponse.value.json();

        const articlesResponseData: CourseArticlesResponse =
          await articlesResponse.value.json();

        usernames = usersResponseData.course.users.map((user) => user.username);

        articleTitles = articlesResponseData.course.articles.map(
          (article) => article.title
        );
      } else {
        const usersResponseData: CampaignUsersResponse =
          await usersResponse.value.json();

        const articlesResponseData: CampaignArticlesResponse =
          await articlesResponse.value.json();

        usernames = usersResponseData.users.map((user) => user.username);

        articleTitles = articlesResponseData.articles.map(
          (article) => article.title
        );
      }

      if (articleTitles.length === 0) {
        toast("No articles found");
      }
      if (usernames.length === 0) {
        toast("No users found");
      }

      setUsernames(usernames);
      setArticleTitles(articleTitles);
      setCourseSlug(slug);
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
          {articleTitles && articleTitles.length > 0 && (
            <ArticlesTable
              articles={articleTitles}
              filename={`${courseSlug}-wikiarticles`}
            />
          )}
          {usernames && usernames.length > 0 && (
            <ArticlesTable
              articles={usernames}
              filename={`${courseSlug}-wikiusernames`}
              headerTitle="Username"
            />
          )}
        </div>
      )}
    </div>
  );
}
