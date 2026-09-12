import { useState } from 'react';

export const PAGE_SIZE_OPTIONS = [15, 30, 50];
const STORAGE_KEY = 'silknode_page_size';

function readStoredPageSize(): number {
  try {
    const stored = Number(sessionStorage.getItem(STORAGE_KEY));
    return PAGE_SIZE_OPTIONS.includes(stored) ? stored : PAGE_SIZE_OPTIONS[0];
  } catch {
    return PAGE_SIZE_OPTIONS[0];
  }
}

/** T10 — sahifalash hajmini (15/30/50) sessiya davomida saqlaydi. */
export function usePageSize(): [number, (size: number) => void] {
  const [pageSize, setPageSizeState] = useState<number>(readStoredPageSize);

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    try {
      sessionStorage.setItem(STORAGE_KEY, String(size));
    } catch {
      // sessionStorage mavjud bo'lmasa — jim o'tkazib yuboriladi.
    }
  };

  return [pageSize, setPageSize];
}
