import { useRef } from "react";

const LONGITUD_OTP = 6;

/**
 * Captura de código OTP como `LONGITUD_OTP` casillas individuales, con
 * avance/retroceso automático de foco entre dígitos y soporte de pegado
 * (el usuario puede pegar el código completo recibido por SMS/correo).
 *
 * @param {Object} props
 * @param {string} props.value               Código actual, ej. "123" (parcial) o "123456".
 * @param {(value: string) => void} props.onChange
 */
function OtpInput({ value, onChange }) {
  const inputsRef = useRef([]);
  const digitos = value.padEnd(LONGITUD_OTP, " ").split("");

  function actualizarDigito(indice, caracter) {
    const soloNumero = caracter.replace(/[^0-9]/g, "");
    const nuevosDigitos = value.split("");
    nuevosDigitos[indice] = soloNumero;
    const nuevoValor = nuevosDigitos.join("").slice(0, LONGITUD_OTP);
    onChange(nuevoValor);

    if (soloNumero && indice < LONGITUD_OTP - 1) {
      inputsRef.current[indice + 1]?.focus();
    }
  }

  function manejarTeclaAbajo(indice, event) {
    if (event.key === "Backspace" && !digitos[indice].trim() && indice > 0) {
      inputsRef.current[indice - 1]?.focus();
    }
  }

  function manejarPegado(event) {
    event.preventDefault();
    const pegado = event.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, LONGITUD_OTP);
    onChange(pegado);
    inputsRef.current[Math.min(pegado.length, LONGITUD_OTP - 1)]?.focus();
  }

  return (
    <div className="flex gap-2 justify-center" onPaste={manejarPegado}>
      {digitos.map((digito, indice) => (
        <input
          // eslint-disable-next-line react/no-array-index-key -- posición fija, no hay id natural por casilla.
          key={indice}
          ref={(el) => (inputsRef.current[indice] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digito.trim()}
          onChange={(event) => actualizarDigito(indice, event.target.value)}
          onKeyDown={(event) => manejarTeclaAbajo(indice, event)}
          className="w-12 h-14 text-center text-[24px] font-technical-mono font-bold border border-outline-variant rounded-lg bg-surface-bright text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />
      ))}
    </div>
  );
}

export default OtpInput;
