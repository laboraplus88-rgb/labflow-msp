# LabFlow — Laboratorio Clínico MSP

**LabFlow** digitaliza el formulario **SNS-MSP / HCU-form.010A / 2008** del Ministerio de Salud Pública del Ecuador.

Plataforma de vanguardia para centros de salud y subcentros (demo: **C.S. El Paraíso · UO 493**).

## Módulos

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| **Estadísticas** | `/` | Dashboard principal: KPIs, recolección, alertas TAT, cuellos de botella, mix y médicos |
| **Solicitud y toma** | `/exam-request-sample-collection` | Formulario 010A + catálogo + etiquetas de muestra profesionales |
| **Procesamiento** | `/test-processing-workflow` | Pipeline por etapas, ingreso de resultados, validación y rechazo |
| **Historial paciente** | `/patient-history` | Búsqueda por nombre/cédula, historial por fecha, resultados de laboratorio |
| **Login** | `/sign-up-login-screen` | Autenticación con cuentas demo por rol |

## Características clave

- **Etiquetas de muestra profesionales** con código de barras visual, CI, tipo de tubo y color por tubo
- **Historial del paciente** por fecha con flags (normal / alto / bajo / crítico)
- **Búsqueda** por nombre o número de cédula
- **Origen**: Centro de Salud o Subcentro (seleccionable en la solicitud)
- **Flujo del médico**: buscar/crear paciente → seleccionar exámenes → ver resultados en consulta
- Control de plazos de entrega (TAT) con alertas
- Catálogo de 7 secciones

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript
- Tailwind CSS 3.4 · Recharts · react-hook-form · Lucide
- Fuente: Plus Jakarta Sans

## Cuentas de demostración

| Rol | Correo | Contraseña |
|-----|--------|------------|
| Jefa de laboratorio | jefatura@labflow.msp.gob.ec | Lab2026!Jefa |
| Bioquímico / Tecnólogo | tecnologo@labflow.msp.gob.ec | Lab2026!Tecn |
| Toma de muestras | muestras@labflow.msp.gob.ec | Lab2026!Toma |
| Médico solicitante | medico@labflow.msp.gob.ec | Lab2026!Medi |

## Scripts

```bash
npm install
npm run dev          # http://localhost:4028
npm run build
```

---

**C.S. El Paraíso · UO 493 · MSP Ecuador**  
Ambiente profesional y de vanguardia
