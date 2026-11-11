# Facturacion y cobranza (fase 1: base de datos)

Estado: tablas, politicas y funciones aplicadas en Supabase (version endurecida, 2026-11-11).

## Tablas
`billing_price_items`, `invoices`, `invoice_items`, `payments`. Todas con `laboratory_id` y RLS **forzado**.

## Quien puede que
| Rol | Ver | Escribir |
|---|---|---|
| jefa | facturas, items, pagos, precios | emitir, cobrar, anular, editar precios |
| tecnologo | facturas, items, pagos, precios | emitir y cobrar |
| toma | solo lectura | nada |
| medico, superadmin | nada | nada |

## Regla clave: la escritura es SOLO por funciones
`invoices`, `invoice_items` y `payments` **no admiten insert/update/delete directo** desde la app (permiso revocado).
La interfaz debe llamar a estas funciones (`supabase.rpc(...)`):
- `billing_issue_from_request(p_request_id, p_payer_type, p_payer_name, p_discount)` emite la factura de una orden.
  Una sola factura vigente por orden. Precio: `billing_price_items` y, si falta, el precio del catalogo del laboratorio (`tests.price`).
- `billing_register_payment(p_invoice_id, p_amount, p_method, p_reference, p_notes)` registra un pago; no puede exceder el saldo.
  Estados: `issued` -> `partial` -> `paid`.
- `billing_void_invoice(p_invoice_id, p_reason)` anula (solo jefa y solo sin pagos).

## Pendiente para la fase 2
- Numeracion secuencial por laboratorio (hoy `F-AAAAMMDD-xxxxxx`, aleatoria) y factura electronica del SRI.
- Notas de credito para facturas con pagos.
- Pantalla de caja, cierre diario y reportes.
