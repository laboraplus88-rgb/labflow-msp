# Agenda y citas (fase 1: base de datos)

Estado: tablas, politicas y funciones aplicadas en Supabase. Recurso inicial `BOX-1` creado en cada laboratorio activo.

## Tablas
`appointment_resources` (boxes), `appointments`, `appointment_waitlist` (lista de espera). Todas con `laboratory_id` y RLS **forzado**.

## Quien puede que
| Rol | Ver | Escribir |
|---|---|---|
| jefa, tecnologo | citas, lista de espera, recursos | todo, incluida la gestion de recursos |
| toma | citas y lista de espera; ve los recursos | crear, cancelar, reprogramar, lista de espera |
| medico | solo la lista de recursos | nada (no ve la agenda del laboratorio) |
| superadmin | nada | nada |

Paciente, recurso y orden de una cita deben pertenecer al mismo laboratorio (validado en la funcion y en la politica).

## Funciones (`supabase.rpc(...)`)
- `appointment_create(...)`, `appointment_cancel(p_appointment_id, p_reason)`, `appointment_reschedule(...)`.
- Otros cambios de estado (confirmar, llegada, en curso, completada, no asistio) se hacen con update directo, permitido por la politica.

## Pendiente
- Impedir doble reserva del mismo recurso y horario (hoy no se valida).
- Recordatorios por correo o WhatsApp y portal de citas del paciente.
