import { createContext } from "react";

const SearchContext = createContext({
  query: "",
  setQuery: () => {},
  mostrarResultados: false,
  setMostrarResultados: () => {},
  dismissSuggestions: () => {},
});

export default SearchContext;
