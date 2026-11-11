# Módulo Agenda y Citas (fase 1)

## Aplicar en Supabase

1. SQL Editor → ejecutar `migrations/20261109_appointments_module.sql`
2. Verificar:

```sql
select tablename, policyname, cmd
from pg_policies
where tablename in ('appointment_resources', 'appointments', 'appointment_waitlist')
order by 1, 2;
```

## Tablas

| Tabla | Uso |
|-------|-----|
| `appointment_resources` | Boxes / áreas de toma |
| `appointments` | Citas |
| `appointment_waitlist` | Lista de espera |

## Estados de cita

`scheduled` → `confirmed` → `checked_in` → `in_progress` → `completed`  
También: `cancelled`, `no_show`

## Prioridades

`normal` | `prioritario` | `programa_publico` | `urgente`

## RPCs

- `appointment_create(...)`
- `appointment_cancel(id, reason)`
- `appointment_reschedule(id, scheduled_at, resource_id, duration)`

## Roles

| Rol | Recursos | Citas | Lista espera |
|-----|----------|-------|--------------|
| jefa / tecnologo | R/W | R/W | R/W |
| toma | R | R/W | R/W |
| medico | R recursos/citas | — escritura | — |
| superadmin | — | — | — |

## Setup inicial recomendado

Tras aplicar el SQL, crear al menos un recurso por laboratorio:

```sql
insert into public.appointment_resources (laboratory_id, name, code, resource_type)
select id, 'Box 1 - Toma de muestras', 'BOX-1', 'toma'
from public.laboratories
where active = true
on conflict do nothing;
```

## Fase 2 (UI) — pendiente

- `/appointments` calendario / día
- Crear, confirmar, cancelar, reprogramar
- Lista de espera
- Enlace opcional a `exam_request_id`
