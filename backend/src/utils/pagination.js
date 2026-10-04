const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export function parsePagination(query = {}) {
  const pageValue = Number.parseInt(query.page, 10);
  const limitValue = Number.parseInt(query.limit, 10);
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const limit = Number.isInteger(limitValue) && limitValue > 0
    ? Math.min(limitValue, MAX_LIMIT)
    : DEFAULT_LIMIT;
  return { page, limit, offset: (page - 1) * limit };
}

export function setPaginationHeaders(res, { page, limit, total }) {
  const totalPages = Math.ceil(total / limit);
  res.set({
    "X-Pagination-Page": String(page),
    "X-Pagination-Limit": String(limit),
    "X-Pagination-Total": String(total),
    "X-Pagination-Total-Pages": String(totalPages),
  });
}
