type PaginationType = {
  page: number;
  limit: number;
  total: number;
};

export const Pagination = ({ page, limit, total }: PaginationType) => {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    totalPages,
    currentPage: page,
    limit,
  };
};
