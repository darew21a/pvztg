import { useEffect, useState } from "react";
import { obtenerTicketsCombustible, suscribirTicketsCombustible } from "../data/combustibleTicketsStore.js";
import { reemplazarTicketsCombustible } from "../data/combustibleTicketsStore.js";
import { obtenerTicketsApi } from "../services/combustibleService.js";
import { crearCargaCompartida } from "../utils/cargaCompartida.js";

const cargarTicketsCompartidos = crearCargaCompartida(() => obtenerTicketsApi().then((remotos) => {
  reemplazarTicketsCombustible(remotos);
  return remotos;
}));

export function useTicketsCombustible() {
  const [tickets, setTickets] = useState(obtenerTicketsCombustible());

  useEffect(() => {
    const limpiar = suscribirTicketsCombustible(setTickets);
    cargarTicketsCompartidos().catch((error) => {
      console.error("No fue posible cargar tickets de combustible desde la API.", error);
    });
    const timer = window.setInterval(() => {
      cargarTicketsCompartidos(true).catch((error) => console.error("No fue posible actualizar tickets de combustible desde la API.", error));
    }, 15000);
    return () => {
      window.clearInterval(timer);
      limpiar();
    };
  }, []);

  return tickets;
}
