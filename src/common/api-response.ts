export function apiData<T>(data: T): { data: T } {
  return { data };
}

export function apiList<T>(
  data: T[],
  page = 1,
  limit = 20,
  total = data.length,
): { data: T[]; meta: { page: number; limit: number; total: number; hasNextPage: boolean } } {
  return {
    data,
    meta: { page, limit, total, hasNextPage: page * limit < total },
  };
}
