import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import TopicService from "../services/topic.service";
import "~/styles/main.postcss";

import Root from "../components/root.component";

import TopicIndex from "../components/topic-index.component";
import MyTopicIndex from "../components/my-topic-index.component";
import TopicDetail from "../components/topic-detail.component";
import NewTopic from "../components/new-topic.component";
import EditTopic from "../components/edit-topic.component";
import WikipediaCategoryPage from "../components/wikipedia-category-page.component";
import QueryBuilder from "../components/query-builder.component";
import { Toaster } from "react-hot-toast";

async function topicIndexLoader() {
  const topics = await TopicService.getAllTopics();
  return { topics };
}

async function wikisLoader() {
  const wikis = await TopicService.getAllWikis();
  return { wikis };
}

async function myTopicIndexLoader() {
  const topics = await TopicService.getAllOwnedTopics();
  return { topics };
}

export async function topicDetailLoader({ params }) {
  const topic = await TopicService.getTopic(params.id);
  const topicTimepoints = await TopicService.getTopicTimepoints(params.id);
  return { topic, topicTimepoints };
}

export async function topicEditLoader({ params }) {
  const topic = await TopicService.getTopic(params.id);
  const wikis = await TopicService.getAllWikis();
  return { wikis, topic };
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
        path: "/my-topics/edit/:id",
        loader: topicEditLoader,
        element: <EditTopic />,
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
