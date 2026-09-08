# Portal PV-ZTG — Sistema de Gestión de Flota

Conversión completa a React + Vite + SWC + Tailwind del prototipo HTML de
7 páginas (login, auditoría Edenred, módulo de flota, gestión de accesos,
captura móvil, dashboard, reportes).

## Stack
- Vite 8 + `@vitejs/plugin-react-swc`
- React 19, React Router 7
- Tailwind CSS 3
- JavaScript + JSX puro (sin TypeScript)

## Cómo correrlo
```
npm install
npm run dev
```

## Qué se portó (contenido real, no placeholders)
Las 7 páginas tienen ya el contenido completo del prototipo original,
con la interactividad que antes vivía en `<script>` sueltos convertida a
hooks de React:

| Página | Interactividad portada |
|---|---|
| Login | Spinner de envío → `useState(isLoading)` + redirección a `/dashboard` |
| Auditoría Edenred | Modal de auditoría (abrir/cerrar/backdrop) → `useState(isAuditModalOpen)` |
| Módulo de Flota | Panel "Expediente" (slide-over) → `useState(selectedUnit)` |
| Gestión de Accesos | Toggles de estado de usuario → `defaultChecked` (no controlados aún) |
| Captura Móvil | Slider "swipe to send" → componente `SwipeToSend` con Pointer Events |
| Dashboard | Sin JS propio en el original — solo maquetación |
| Reportes | Filtros (selects/fecha) → `useState(isRefreshing)` simulando recarga |

## Componentes compartidos
- `components/layout/SideNavBar.jsx` — unifica las 5 variantes casi
  idénticas de sidebar que traía el prototipo, con estado activo por ruta
  (`NavLink`).
- `components/layout/TopNavBar.jsx` — header superior con tabs
  Resumen/Operaciones/Alertas, parametrizado por página.
- `components/layout/AppLayout.jsx` — envuelve todas las páginas del panel
  excepto Login y Captura Móvil (pantallas standalone, sin nav global,
  igual que en el prototipo).
- `components/ui/SwipeToSend.jsx` — el slider de Captura Móvil.
- `components/ui/BentoGrid.jsx`, `StatusBadge.jsx` — piezas base del
  design system, ya preparadas para las páginas que aún no las usan.

## Decisiones pendientes de confirmar
1. **Color `primary`**: el HTML original y el documento de diseño formal
   ("Institutional Technical Core") no coinciden — ver el comentario al
   inicio de `tailwind.config.js`. Se usó el documento de diseño como
   fuente de verdad.
2. **Modo oscuro de Accesos**: el prototipo tenía esta página en `dark`
   forzado (`html class="dark"`, fondo `#121212`). Se portó en modo claro
   para mantener consistencia visual con el resto del panel — si se quiere
   ese modo oscuro específico, es un ajuste de clases, no estructural.
3. **Checkboxes de Accesos**: están como `defaultChecked` (no controlados).
   Falta decidir si el toggle debe pegarle a una API al cambiar o solo
   quedar en estado local.

## Pendiente real (no incluido)
- Conectar todo a datos reales — hoy todo el contenido (tablas, KPIs,
  logs) es el mismo mock que traía el prototipo.
- Formularios: ningún `<input>` está validado ni conectado a estado más
  allá de lo mencionado arriba.
- Responsive: el prototipo original ya traía clases `md:`/`lg:` en varios
  puntos y se conservaron, pero no se re-testeó pixel a pixel en mobile.
