export async function fetchAverageDailyViews(
  topicId: number | string,
  article: string,
  year: number,
  startMonth: number = 1,
  startDay: number = 1,
  endMonth: number = 12,
  endDay: number = 31
): Promise<number> {
  const params = new URLSearchParams({
    article,
    year: year.toString(),
    start_month: startMonth.toString(),
    start_day: startDay.toString(),
    end_month: endMonth.toString(),
    end_day: endDay.toString(),
  });

  const url = `/api/topics/${topicId}/pageviews?${params}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch pageviews: ${res.statusText}`);

  const data = await res.json();
  return data.average_daily_views || 0;
}
