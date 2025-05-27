export async function fetchAverageDailyViews(
  article: string,
  project: string,
  year: number,
  startMonth: number = 1,
  startDay: number = 1,
  endMonth: number = 12,
  endDay: number = 31
): Promise<number> {
  const formatNumber = (num: number): string => num.toString().padStart(2, "0");

  const start = `${year}${formatNumber(startMonth)}${formatNumber(startDay)}`;
  const end = `${year}${formatNumber(endMonth)}${formatNumber(endDay)}`;

  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${project}/all-access/all-agents/${encodeURIComponent(
    article
  )}/daily/${start}/${end}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch pageviews: ${res.statusText}`);
  const data = await res.json();

  const totalViews = data.items.reduce(
    (sum: number, item: any) => sum + item.views,
    0
  );
  const numDays = data.items.length;

  return numDays > 0 ? totalViews / numDays : 0;
}
