# Módulo Facturación (fase 1)

## Aplicar en Supabase

1. SQL Editor → ejecutar `migrations/20261109_billing_module.sql`
2. Verificar policies:

```sql
select tablename, policyname, cmd
from pg_policies
where tablename in ('billing_price_items','invoices','invoice_items','payments')
order by 1, 2;
```

## Tablas

| Tabla | Uso |
|-------|-----|
| `billing_price_items` | Precio por `exam_code` y laboratorio |
| `invoices` | Factura (ligada a patient / exam_request) |
| `invoice_items` | Líneas |
| `payments` | Cobros (sin update/delete) |

## RPCs

- `billing_issue_from_request(request_id, payer_type, payer_name, discount)`
- `billing_register_payment(invoice_id, amount, method, reference, notes)`

## Roles

| Rol | Precios | Facturas | Pagos |
|-----|---------|----------|-------|
| jefa / tecnologo | R/W | R/W | insert |
| toma | R | R | — |
| medico | — | — | — |
| superadmin | — | — | — |

## Fase 2 (UI Next.js) — pendiente

- `/billing` listado + detalle
- Cargar precios desde catálogo de exámenes
- Botón «Facturar orden» desde solicitud / workflow
- Registrar pago

## Fase 3 — pendiente

- Convenios / glosas sector público ampliados
- Numeración formal / correlativos fiscales Ecuador si aplica
