"use client";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onChange }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      <button className="btn btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        上一页
      </button>
      <span className="page-info">
        第 {page} / {pages} 页 · 共 {total} 条
      </span>
      <button
        className="btn btn-sm"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        下一页
      </button>
    </div>
  );
}
