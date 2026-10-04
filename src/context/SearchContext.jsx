import { useState } from "react";
import SearchContext from "./searchContext.js";

export function SearchProvider({ children }) {
  const [query, setQuery] = useState("");
  const [mostrarResultados, setMostrarResultados] = useState(false);

  const dismissSuggestions = () => setMostrarResultados(false);

  return (
    <SearchContext.Provider value={{ query, setQuery, mostrarResultados, setMostrarResultados, dismissSuggestions }}>
      {children}
    </SearchContext.Provider>
  );
}
