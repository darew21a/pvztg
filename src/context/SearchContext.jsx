import { createContext, useContext, useState } from "react";

const SearchContext = createContext({
  query: "",
  setQuery: () => {},
  mostrarResultados: false,
  setMostrarResultados: () => {},
});

export function SearchProvider({ children }) {
  const [query, setQuery] = useState("");
  const [mostrarResultados, setMostrarResultados] = useState(false);

  return <SearchContext.Provider value={{ query, setQuery, mostrarResultados, setMostrarResultados }}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  return useContext(SearchContext);
}
