import { useEffect } from "react";

const BRAND_NAME = "Best Motors";

function formatPageTitle(title) {
  if (!title) return BRAND_NAME;
  return `${title} | ${BRAND_NAME}`;
}

export default function usePageTitle(title) {
  useEffect(() => {
    document.title = formatPageTitle(title);
  }, [title]);
}
