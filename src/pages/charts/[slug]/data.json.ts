import type { APIRoute, GetStaticPaths } from 'astro';
import { getCharts, getChartData } from '../../../lib/charts';

// Publishes each chart's data.json next to its page: /charts/<slug>/data.json
// The chart page fetches it, and it doubles as the "Download data" link.

export const getStaticPaths: GetStaticPaths = async () => {
  const charts = await getCharts();
  return charts.map((chart) => ({
    params: { slug: chart.id },
    props: { data: getChartData(chart) },
  }));
};

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(props.data), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
