import { useNavigate } from "react-router-dom";
import catIllustration from "../assets/not-found-cat.svg";
import logoCfe from "../assets/logo-cfe.png";

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="relative h-screen w-screen bg-gray-100 flex items-center">
      <img
        src={logoCfe}
        alt="Comisión Federal de Electricidad"
        className="absolute left-1/2 top-6 w-28 -translate-x-1/2 object-contain"
      />
      <div className="container flex flex-col md:flex-row items-center justify-center px-5 pt-20 text-gray-700">
        <div className="max-w-md">
          <div className="text-5xl font-dark font-bold">404</div>
          <p className="text-2xl md:text-3xl font-light leading-normal">Lo sentimos, no pudimos encontrar esta página.</p>
          <p className="mb-8">No te preocupes, puedes encontrar muchas otras opciones en nuestra página de inicio.</p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-4 inline py-2 text-sm font-medium leading-5 shadow text-white transition-colors duration-150 border border-transparent rounded-lg focus:outline-none focus:shadow-outline-blue bg-blue-600 active:bg-blue-600 hover:bg-blue-700"
          >
            volver al inicio
          </button>
        </div>
        <div className="max-w-lg">
          <img src={catIllustration} width="400" alt="Ilustración de gato en la página no encontrada" />
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;