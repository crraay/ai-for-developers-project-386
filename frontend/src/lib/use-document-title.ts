import { useEffect } from 'react';

/** Route titles, the React equivalent of the router's `title` option. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
