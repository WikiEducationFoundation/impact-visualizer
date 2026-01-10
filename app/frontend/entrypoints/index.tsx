// NPM
import "../services/sentry.service";
import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// Styles
import "~/styles/main.postcss";

// Components
import Root from "../components/root.component";
import TopicIndex from "../components/topic-index.component";
import MyTopicIndex from "../components/my-topic-index.component";
import TopicDetail from "../components/topic-detail.component";
import NewTopic from "../components/new-topic.component";
import EditTopic from "../components/edit-topic.component";
import WikipediaCategoryPage from "../components/wikipedia-category-page.component";
import QueryBuilder from "../components/query-builder.component";
import { Toaster } from "react-hot-toast";
import WikiDashboardCourseTool from "../components/wiki-dashboard-tool.component";
import PetScanTool from "../components/petscan-tool";
import PagePileTool from "../components/pagepile-tool";
import UserSetTool from "../components/user-set-tool";
import WikiDashboardUserTool from "../components/wiki-dashboard-user-tool.component";

// Misc
const queryClient = new QueryClient();

declare global {
  interface Window {
    app: {
      signedIn: boolean;
      username: string | undefined;
      isAdmin: boolean;
    };
  }
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      {
        path: "/",
        element: <TopicIndex />,
      },
      {
        path: "/my-topics",
        element: <MyTopicIndex />,
      },
      {
        path: "/my-topics/new",
        element: <NewTopic />,
      },
      {
        path: "/my-topics/edit/:id",
        element: <EditTopic />,
      },
      {
        path: "/topics/:id",
        element: <TopicDetail />,
      },
      {
        path: "/search/wikidata-tool",
        element: <QueryBuilder />,
      },
      {
        path: "/search/wikipedia-category-tool",
        element: <WikipediaCategoryPage />,
      },
      {
        path: "/search/wiki-dashboard-course-tool",
        element: <WikiDashboardCourseTool />,
      },
      {
        path: "/search/wiki-dashboard-user-tool",
        element: <WikiDashboardUserTool />,
      },
      {
        path: "/search/petscan-tool",
        element: <PetScanTool />,
      },
      {
        path: "/search/pagepile-tool",
        element: <PagePileTool />,
      },
      {
        path: "/search/user-set-tool",
        element: <UserSetTool />,
      },
    ],
  },
]);

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ReactQueryDevtools />
    </QueryClientProvider>
    <Toaster />
  </>
);
