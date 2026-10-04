import { useContext } from "react";
import SearchContext from "./searchContext.js";

export function useSearch() {
  return useContext(SearchContext);
}
