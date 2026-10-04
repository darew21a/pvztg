const requests = new Map();
const startedAt = new Date().toISOString();

function getMetric(path) {
  const current = requests.get(path);
  if (current) return current;
  const metric = {
    count: 0,
    statuses: {},
    durationsMs: [],
  };
  requests.set(path, metric);
  return metric;
}

function percentile(values, percentile) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((percentile / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

export function recordRequest({ path, status, durationMs }) {
  const metric = getMetric(path);
  metric.count += 1;
  const statusKey = String(status);
  metric.statuses[statusKey] = (metric.statuses[statusKey] || 0) + 1;
  metric.durationsMs.push(Math.max(0, Number(durationMs) || 0));
  if (metric.durationsMs.length > 1000) metric.durationsMs.shift();
}

export function getMetrics() {
  const byPath = {};
  let totalRequests = 0;
  let totalErrors = 0;
  const allDurations = [];

  for (const [path, metric] of requests.entries()) {
    const durations = [...metric.durationsMs];
    byPath[path] = {
      count: metric.count,
      statuses: { ...metric.statuses },
      latencyMs: {
        p50: percentile(durations, 50),
        p95: percentile(durations, 95),
      },
    };
    totalRequests += metric.count;
    totalErrors += Object.entries(metric.statuses)
      .filter(([status]) => Number(status) >= 400)
      .reduce((sum, [, count]) => sum + count, 0);
    allDurations.push(...durations);
  }

  return {
    startedAt,
    totalRequests,
    totalErrors,
    latencyMs: {
      p50: percentile(allDurations, 50),
      p95: percentile(allDurations, 95),
    },
    byPath,
  };
}

export function resetMetrics() {
  requests.clear();
}
