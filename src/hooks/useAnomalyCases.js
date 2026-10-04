import { useCallback, useEffect, useState } from "react";
import { obtenerTodasLasPaginas } from "../services/paginacionApi.js";

export function useAnomalyCases(token) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async (signal) => {
    const body = await obtenerTodasLasPaginas("/anomalias/casos", { signal, token });
    setCases(body);
    setError("");
    return body;
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    const load = () => refresh(controller.signal)
      .catch((loadError) => {
        if (loadError.name !== "AbortError") setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    const reloadWhenVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    load();
    const timer = window.setInterval(load, 15000);
    window.addEventListener("focus", reloadWhenVisible);
    document.addEventListener("visibilitychange", reloadWhenVisible);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", reloadWhenVisible);
      document.removeEventListener("visibilitychange", reloadWhenVisible);
    };
  }, [refresh]);

  return { cases, setCases, loading, error, refresh };
}
