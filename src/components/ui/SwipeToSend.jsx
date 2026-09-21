import { useRef, useState } from "react";

/**
 * Control "deslizar para enviar" de la Captura Móvil. Reemplaza el script
 * vanilla del prototipo (mousedown/touchstart + manipulación directa de
 * `style.transform`) por estado de React + Pointer Events, que unifican
 * mouse y touch en un solo set de handlers.
 */
function SwipeToSend({ onComplete }) {
  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  function handlePointerDown(event) {
    setIsDragging(true);
    startXRef.current = event.clientX - dragX;
    thumbRef.current?.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!isDragging || !trackRef.current || !thumbRef.current) return;
    const maxX = trackRef.current.offsetWidth - thumbRef.current.offsetWidth - 8;
    const nextX = Math.min(Math.max(event.clientX - startXRef.current, 0), maxX);
    setDragX(nextX);
    if (nextX >= maxX) {
      setIsDragging(false);
      onComplete?.();
    }
  }

  function handlePointerUp() {
    setIsDragging(false);
    setDragX(0);
  }

  return (
    <div ref={trackRef} className="swipe-track shadow-sm border border-outline-variant/20 backdrop-blur-md">
      <div className="swipe-text font-label-sm tracking-widest uppercase">Deslizar para Enviar</div>
      <div
        ref={thumbRef}
        className="swipe-thumb"
        style={{ transform: `translateX(${dragX}px)`, transition: isDragging ? "none" : "transform 0.3s ease" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <span className="material-symbols-outlined">double_arrow</span>
      </div>
    </div>
  );
}

export default SwipeToSend;
