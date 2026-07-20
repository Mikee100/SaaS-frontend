import React from "react";

const PAGE_SIZE = 20;

export function usePagination<T>(items: T[]) {
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pageItems = React.useMemo(
    () => items.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE),
    [items, clampedPage],
  );

  React.useEffect(() => {
    setPage(1);
  }, [items.length]);

  return { page: clampedPage, setPage, totalPages, pageItems, pageSize: PAGE_SIZE };
}

export default function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-600">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
