import { useEffect, useRef } from "react";

// This is a custom hook that has an abstract implementation for tracking clicks outside of a tracked ref.
const useOutsideClick = (callback: () => void) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [callback]);

  return ref;
};

export default useOutsideClick;
