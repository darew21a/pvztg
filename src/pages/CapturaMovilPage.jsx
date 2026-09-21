import SwipeToSend from "../components/ui/SwipeToSend.jsx";

/**
 * Captura Móvil. Portado del prototipo HTML (líneas 1685-2068 del original).
 * Pantalla transaccional sin navegación global, tal como indicaba el
 * comentario original ("Contextual Suppression... no global nav").
 */
function CapturaMovilPage() {
  return (
    <div className="bg-surface-container flex flex-col min-h-screen font-body-md text-on-surface max-w-[428px] mx-auto relative">
{/* TopNav - Contextual Suppression applies, this is a transactional screen, no global nav */}
{/* Mobile Header */}
<header className="bg-primary-container text-on-primary w-full px-margin-mobile py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined" style={{fontVariationSettings: '\'FILL\' 1'}}>bolt</span>
<span className="font-title-md text-title-md text-white">CFE</span>
</div>
<div className="font-title-md text-[18px] font-semibold text-white">
            Unidad 08
        </div>
<div className="w-6"></div> {/* Spacer for balance */}
</header>
{/* Main Content Canvas */}
<main className="flex-1 overflow-y-auto px-margin-mobile py-6 flex flex-col gap-6 relative pb-24">
{/* Greeting */}
<div className="px-2">
<h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-1">Buen turno,</h1>
<p className="font-body-lg text-body-lg text-on-surface-variant">Carlos Mendoza</p>
</div>
{/* Action Card (Glassmorphism) */}
<div className="glass-card rounded-[1.5rem] p-5 flex flex-col gap-5 border border-outline-variant/20 shadow-sm">
{/* Type Selector */}
<div className="grid grid-cols-3 gap-2 bg-surface-container-low p-1 rounded-xl border border-outline-variant/30">
<button className="py-3 px-2 rounded-lg font-label-sm text-label-sm text-on-surface-variant bg-transparent transition-colors">
                    Inicio
                </button>
<button className="py-3 px-2 rounded-lg font-label-sm text-label-sm text-on-primary bg-secondary shadow-md transition-colors flex items-center justify-center gap-1">
<span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: '\'FILL\' 1'}}>local_gas_station</span>
                    Carga
                </button>
<button className="py-3 px-2 rounded-lg font-label-sm text-label-sm text-on-surface-variant bg-transparent transition-colors">
                    Fin
                </button>
</div>
{/* Odometer Input Module */}
<div className="flex flex-col gap-2 mt-2">
<label className="font-label-sm text-label-sm text-on-surface uppercase tracking-wider pl-1 flex items-center gap-1">
<span className="material-symbols-outlined text-[16px]">speed</span>
                    Kilometraje Actual
                </label>
<div className="relative bg-surface-container-lowest border-b-2 border-outline-variant focus-within:border-secondary transition-colors rounded-t-lg">
<input className="odometer-input w-full bg-transparent border-none focus:ring-0 text-[40px] font-technical-mono font-bold text-on-surface py-4 px-4 rounded-t-lg" inputMode="numeric" placeholder="000,000" type="text" defaultValue="145,820"/>
<span className="absolute right-4 bottom-4 font-body-md text-on-surface-variant font-bold">KM</span>
</div>
</div>
{/* Camera / Receipt Module */}
<div className="flex flex-col gap-2 mt-2">
<label className="font-label-sm text-label-sm text-on-surface uppercase tracking-wider pl-1">Evidencia</label>
<div className="flex gap-3 h-24">
{/* Camera Button */}
<button className="flex-1 bg-surface-container-low border border-dashed border-outline hover:bg-surface-container transition-colors rounded-xl flex flex-col items-center justify-center gap-1 text-on-surface-variant">
<span className="material-symbols-outlined text-[28px]">add_a_photo</span>
<span className="font-label-sm text-[10px]">CAPTURAR</span>
</button>
{/* Thumbnail Placeholder with Glow */}
<div className="w-24 h-24 rounded-xl overflow-hidden relative border-2 border-secondary-fixed shadow-[0_0_15px_rgba(111,251,190,0.3)] bg-surface-container-highest">
<img alt="Ticket thumbnail" className="w-full h-full object-cover opacity-80" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAPrvCrvHfitklSfaaKcOv06dF5eZVMta6KFdIWxJMck2SLkMfdSeIa9XuuKhFRMvDJkDsi61mb_Pc1Ym6N81X4oSp-F7tRmIXs9jB0wTfq3MQwDmcu83mHLx5a9yZJPfNFeTfOJCvYQFMFwRqChkM6IOO-c46YxOAH7vb5oGQ7jTf0ClSbSuvBiaNaIK4zFAAWbK378YWK7iboX_yeqLjf8EZI0P8CVx6ag9fLGCik09RNtW87iZmQ"/>
<div className="absolute inset-0 bg-primary-container/20"></div>
<div className="absolute bottom-1 right-1 bg-secondary-fixed text-on-secondary-fixed rounded-full w-6 h-6 flex items-center justify-center shadow-md">
<span className="material-symbols-outlined text-[14px]" style={{fontVariationSettings: '\'FILL\' 1'}}>check</span>
</div>
</div>
</div>
</div>
{/* Additional Fields (Optional context) */}
<div className="flex flex-col gap-2 mt-2">
<div className="flex items-center justify-between border-b border-outline-variant/30 py-3">
<span className="font-body-md text-on-surface-variant">Litros</span>
<span className="font-technical-mono text-[16px] text-on-surface font-semibold">45.0 L</span>
</div>
<div className="flex items-center justify-between py-3">
<span className="font-body-md text-on-surface-variant">Monto</span>
<span className="font-technical-mono text-[18px] text-on-surface font-bold">$1,080.50</span>
</div>
</div>
</div>
</main>
      <div className="fixed bottom-0 left-0 right-0 p-margin-mobile bg-gradient-to-t from-surface via-surface/90 to-transparent pb-6 z-40">
        <SwipeToSend onComplete={() => alert("Registro enviado (demo)")} />
      </div>
    </div>
  );
}

export default CapturaMovilPage;
