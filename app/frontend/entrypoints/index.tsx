import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import DataService from "../services/data.service";
import "~/styles/main.postcss";

import Root from "../components/root.component";

import TopicIndex from "../components/topic-index.component";
import MyTopicIndex from "../components/my-topic-index.component";
import TopicDetail from "../components/topic-detail.component";
import NewTopic from "../components/new-topic.component";
import WikipediaCategoryPage from "../components/wikipedia-category-page.component";
import QueryBuilder from "../components/query-builder.component";
import { Toaster } from "react-hot-toast";

async function topicIndexLoader() {
  const topics = await DataService.getAllTopics();
  return { topics };
}

async function wikisLoader() {
  const wikis = await DataService.getAllWikis();
  return { wikis };
}

async function myTopicIndexLoader() {
  const topics = await DataService.getAllOwnedTopics();
  return { topics };
}

export async function topicDetailLoader({ params }) {
  const topic = await DataService.getTopic(params.id);
  const topicTimepoints = await DataService.getTopicTimepoints(params.id);
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
        path: "/my-topics",
        loader: myTopicIndexLoader,
        element: <MyTopicIndex />,
      },
      {
        path: "/my-topics/new",
        loader: wikisLoader,
        element: <NewTopic />,
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
