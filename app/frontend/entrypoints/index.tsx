import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import TopicDataService from '../services/topics.service';
import '~/styles/main.postcss';

import Root from '../components/root.component';

import TopicIndex from '../components/topic-index.component';
import TopicDetail from '../components/topic-detail.component';

async function topicIndexLoader() {
  const topics = await TopicDataService.getAll();
  return { topics };
}

export async function topicDetailLoader({ params }) {
  const topic = await TopicDataService.get(params.id);
  const topicTimepoints = await TopicDataService.getTopicTimepoints(params.id);
  return { topic, topicTimepoints };
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      {
        path: '/',
        loader: topicIndexLoader,
        element: <TopicIndex />
      },
      {
        path: '/topics/:id',
        loader: topicDetailLoader,
        element: <TopicDetail />
      }
    ]
  },
]);

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<RouterProvider router={router}/>);