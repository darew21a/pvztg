import TopNavBar from "../components/layout/TopNavBar.jsx";
import SeguimientoReportes from "../components/reportes/SeguimientoReportes.jsx";
import { useReportes } from "../hooks/useReportes.js";
import { useAuth } from "../hooks/useAuth.js";

function ReportesPage() {
  const reportes = useReportes();
  const { usuario } = useAuth();

  return (
    <>
      <TopNavBar searchPlaceholder="Buscar folio o unidad..." />
      <main className="flex-1 overflow-y-auto bg-background p-margin-mobile md:p-margin-desktop">
        <div className="mx-auto w-full max-w-7xl space-y-6">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary">Reportes e incidencias</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">Bandeja central para revisar reportes y mantener comunicación con los departamentos.</p>
          </div>
          <SeguimientoReportes reportes={reportes} usuario={usuario} />
        </div>
      </main>
    </>
  );
}

export default ReportesPage;
