const buckets = new Map();

function cleanup(now) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function requestRateLimit({ windowMs, max, keyGenerator = (req) => req.ip, message }) {
  if (!Number.isInteger(windowMs) || windowMs <= 0 || !Number.isInteger(max) || max <= 0) {
    throw new Error("La configuración del límite de solicitudes no es válida.");
  }

  return (req, res, next) => {
    const now = Date.now();
    if (buckets.size > 1000) cleanup(now);
    const key = `${req.path}:${keyGenerator(req)}`;
    const current = buckets.get(key);
    const bucket = current && current.resetAt > now
      ? current
      : { count: 0, resetAt: now + windowMs };

    bucket.count += 1;
    buckets.set(key, bucket);
    res.set("RateLimit-Limit", String(max));
    res.set("RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    res.set("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.set("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ mensaje: message });
    }
    return next();
  };
}
