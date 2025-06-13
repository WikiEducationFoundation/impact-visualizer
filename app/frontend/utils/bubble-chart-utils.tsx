export async function fetchAverageDailyViews({
  topicId,
  startDate,
  endDate,
}: {
  topicId: number | string;
  startDate?: string;
  endDate?: string;
}): Promise<number> {
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date();

  const params = new URLSearchParams({
    start_year: start.getFullYear().toString(),
    end_year: end.getFullYear().toString(),
    start_month: (start.getMonth() + 1).toString(),
    start_day: start.getDate().toString(),
    end_month: (end.getMonth() + 1).toString(),
    end_day: end.getDate().toString(),
  });

  const url = `/api/topics/${topicId}/topic_article_analytics?${params}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch pageviews: ${res.statusText}`);

  const data = await res.json();
  return data.average_daily_views || 0;
}
