import logoCfe from "../../assets/logo-cfe.png";

function LoadingState({ label = "Cargando información", fullScreen = false }) {
  return (
    <div
      className={`portal-loading ${fullScreen ? "portal-loading--screen" : "portal-loading--inline"}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="portal-loading__brand">
        <img src={logoCfe} alt="Comisión Federal de Electricidad" />
        <span aria-hidden="true" />
        <div>
          <strong>PV-ZTG</strong>
          <span>CFE Transmisión · Zona Guerrero</span>
        </div>
      </div>
      <p className="portal-loading__message">{label}</p>
      <div className="portal-loading__track" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}

export default LoadingState;
