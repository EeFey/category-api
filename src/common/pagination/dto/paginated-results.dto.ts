export class PaginatedResultsDto<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;

  constructor(data: T[], total: bigint, page: number, limit: number) {
    this.data = data;
    this.total = Number(total);
    this.page = page;
    this.limit = limit;
  }
}