export interface Pagination {
  blocks: number;
  from: number;
}

export interface Domain {
  id: number;
  name: string;
  paginate?: Pagination;
}
