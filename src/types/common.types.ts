export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginationParams {
  page: number;
  limit: number;
}
