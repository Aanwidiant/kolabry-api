export const Pagination = ({ page, limit, total }) => {
    const totalPages = Math.ceil(total / limit);
    return {
        total,
        totalPages,
        currentPage: page,
        limit,
    };
};
