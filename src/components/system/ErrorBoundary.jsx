import { Component } from "react";

class ErrorBoundary extends Component {
  state = { hasError: false, errorId: "" };

  static getDerivedStateFromError(error) {
    const errorId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    console.error("Error inesperado de la interfaz", { errorId, error });
    return { hasError: true, errorId };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Detalles del error de la interfaz", {
      errorId: this.state.errorId,
      error: error?.message,
      componentStack: errorInfo?.componentStack,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6 text-on-surface">
        <section className="w-full max-w-lg space-y-5 rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-lg">
          <div className="flex items-center gap-3 text-error">
            <span className="material-symbols-outlined" aria-hidden="true">error</span>
            <h1 className="text-headline-lg">El portal encontró un problema</h1>
          </div>
          <p className="text-body-md text-on-surface-variant">
            La operación no se perdió. Actualiza la pantalla y vuelve a intentarlo. Si el problema continúa, proporciona este identificador al soporte.
          </p>
          <p className="rounded-lg bg-surface-container-high p-3 font-mono text-sm">
            ID: {this.state.errorId}
          </p>
          <button type="button" onClick={this.handleReload} className="w-full rounded-lg bg-primary p-3 text-on-primary">
            Actualizar portal
          </button>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
