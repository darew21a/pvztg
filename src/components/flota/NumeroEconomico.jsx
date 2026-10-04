function NumeroEconomico({ valor, destacado = false }) {
  return (
    <span className={`numero-economico${destacado ? " numero-economico--destacado" : ""}`}>
      {destacado && <span className="numero-economico__etiqueta">Número económico</span>}
      <strong>{valor || "Pendiente"}</strong>
    </span>
  );
}

export default NumeroEconomico;
