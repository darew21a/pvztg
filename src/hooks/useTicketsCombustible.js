import { useEffect, useState } from "react";
import { obtenerTicketsCombustible, suscribirTicketsCombustible } from "../data/combustibleTicketsStore.js";

export function useTicketsCombustible() {
  const [tickets, setTickets] = useState(obtenerTicketsCombustible());

  useEffect(() => {
    return suscribirTicketsCombustible(setTickets);
  }, []);

  return tickets;
}
