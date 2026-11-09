# Verificar RLS de inventario en Supabase

## Problema detectado (repo)

`20261106_inventory.sql`:
- Crea tablas `inventory_items` / `inventory_movements`
- Hace `ENABLE ROW LEVEL SECURITY`
- **No define** `CREATE POLICY` en el archivo del repo

Si en producción no se aplicaron policies a mano, con RLS activo y **cero policies** el comportamiento por defecto es **denegar todo** a roles no owner (puede romper la UI de inventario). Si alguien aplicó `using (true)`, hay fuga entre laboratorios.

## Qué aplicar

1. Abrir Supabase → SQL Editor del proyecto LabFlow.
2. Ejecutar el contenido de:
   `supabase/migrations/20261109_inventory_rls_policies.sql`
3. Verificar:

```sql
select tablename, policyname, cmd, qual, with_check
from pg_policies
where tablename in ('inventory_items', 'inventory_movements')
order by 1, 2;
```

Esperado:
- `inv_items_select|insert|update|delete`
- `inv_mov_select|insert`
- `qual` / `with_check` referencian `my_laboratory_id()` y roles, **nunca** `true`

## Prueba manual por rol

| Rol | Ver ítems de su lab | Crear movimiento | Ver otro lab |
|-----|---------------------|------------------|--------------|
| jefa | Sí | Sí | No |
| tecnologo | Sí | Sí | No |
| toma | Sí | No | No |
| medico | No | No | No |
| superadmin | No (por diseño de policies) | No | No |

## Nota superadmin

Igual que en datos clínicos (`05_seguridad_multitenant`), el superadmin **no** ve inventario operativo por estas policies. Administra laboratorios desde admin-global, no el kardex de cada sede.
