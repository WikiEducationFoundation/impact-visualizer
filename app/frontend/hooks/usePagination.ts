import { useState } from "react";

interface UsePaginationProps<T> {
  data: T[];
  itemsPerPage: number;
  initialPage?: number;
}

interface UsePaginationReturn<T> {
  currentPageData: T[];
  currentPage: number;
  totalPages: number;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (pageNumber: number) => void;
}

function usePagination<T>({
  data,
  itemsPerPage,
  initialPage = 1,
}: UsePaginationProps<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);

  const totalPages = Math.ceil(data.length / itemsPerPage);

  if (currentPage > totalPages) {
    setCurrentPage(totalPages);
  } else if (currentPage < 1) {
    setCurrentPage(1);
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageData = data.slice(startIndex, endIndex);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const goToPage = (pageNumber: number) => {
    if (pageNumber < 1) {
      setCurrentPage(1);
    } else if (pageNumber > totalPages) {
      setCurrentPage(totalPages);
    } else {
      setCurrentPage(pageNumber);
    }
  };

  return {
    currentPageData,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
  };
}

export default usePagination;
