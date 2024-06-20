import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import TopicDataService from "../services/topics.service";
import "~/styles/main.postcss";

import Root from "../components/root.component";

import TopicIndex from "../components/topic-index.component";
import TopicDetail from "../components/topic-detail.component";
import WikipediaCategoryPage from "../components/wikipedia-category-page.component";
import QueryBuilder from "../components/query-builder.component";
import { Toaster } from "react-hot-toast";

async function topicIndexLoader() {
  const topics = await TopicDataService.getAll();
  return { topics };
}

export async function topicDetailLoader({ params }) {
  const topic = await TopicDataService.get(params.id);
  const topicTimepoints = await TopicDataService.getTopicTimepoints(params.id);
  return { topic, topicTimepoints };
}

declare global {
  interface Window {
    app: {
      signedIn: boolean,
      username: string | undefined
    }
  }
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      {
        path: "/",
        loader: topicIndexLoader,
        element: <TopicIndex />,
      },
      {
        path: "/topics/:id",
        loader: topicDetailLoader,
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
    ],
  },
]);

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <>
    <RouterProvider router={router} />
    <Toaster />
  </>
);
