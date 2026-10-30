# LabFlow — Laboratorio Clínico MSP

**LabFlow** digitaliza el formulario **SNS-MSP / HCU-form.010A / 2008** del Ministerio de Salud Pública del Ecuador.

Plataforma completa para centros de salud (demo: **C.S. El Paraíso · UO 493**):

- **Dashboard de Estadísticas** (pantalla principal al ingresar)
- Solicitud de exámenes + toma de muestras con catálogo de 7 secciones
- Clasificación automática por tipo de tubo y generación de etiquetas
- Workflow de procesamiento por etapas (Solicitado → Entregado)
- Control de plazos de entrega (TAT) con alertas de vencimiento
- Métricas, cuellos de botella, cumplimiento por prioridad y mix de órdenes

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 3.4** + `@tailwindcss/forms` + `typography` + `animate`
- **Recharts** (gráficos)
- **react-hook-form**
- **Lucide React** + Heroicons
- Fuente: Plus Jakarta Sans
- Listo para Netlify (`@netlify/plugin-nextjs`)

## Estructura principal

```
src/
├── app/
│   ├── layout.tsx                 # Root layout + metadata
│   ├── page.tsx                   # Dashboard de Estadísticas (entrada principal)
│   ├── exam-request-sample-collection/
│   │   └── page.tsx               # Solicitud + toma de muestras
│   ├── test-processing-workflow/
│   │   └── page.tsx               # Procesamiento por etapas
│   └── sign-up-login-screen/
│       └── page.tsx               # Auth (demo accounts)
├── components/
│   ├── AppLayout.tsx              # Sidebar + Topbar shell
│   ├── ui/                        # Badge, Modal, Toast, EmptyState, etc.
│   └── ...
└── lib/
    └── labData.ts                 # Catálogo, mock data, tipos, TAT rules
```

## Cuentas de demostración

| Rol                        | Correo                              | Contraseña      |
|---------------------------|-------------------------------------|-----------------|
| Jefa de laboratorio       | jefatura@labflow.msp.gob.ec        | Lab2026!Jefa   |
| Bioquímico / Tecnólogo    | tecnologo@labflow.msp.gob.ec       | Lab2026!Tecn   |
| Toma de muestras          | muestras@labflow.msp.gob.ec        | Lab2026!Toma   |
| Médico solicitante        | medico@labflow.msp.gob.ec          | Lab2026!Medi   |

## Scripts

```bash
npm install
npm run dev          # http://localhost:4028
npm run build
npm run type-check
npm run lint
```

## Notas de backend (pendiente)

Los comentarios `// BACKEND:` indican puntos de integración con Supabase (tablas: patients, exam_requests, samples, tests, profiles + RPC de agregados).

Actualmente todo corre con datos mock en `src/lib/labData.ts`.

## Capturas

El sistema ya está profesionalmente implementado con:

- Bento grid de KPIs
- Gráficos de recolección (hora / semana / mes)
- Panel de alertas de plazo
- Análisis de cuellos de botella por transición
- Cumplimiento radial por prioridad
- Mix de tipo de orden + ranking de médicos
- Catálogo interactivo por secciones (Hematología, Uroanálisis, etc.)
- Drawer de detalle de prueba con timeline y validación
- Sidebar con badges de pendientes y alertas de vencidos

---

**C.S. El Paraíso · UO 493 · MSP Ecuador**  
Built with Rocket.new · Ready for Claude analysis & improvement
