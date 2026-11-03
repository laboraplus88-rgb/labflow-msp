# LabFlow — Roles y cuentas

## Cuentas oficiales de este despliegue

| Email | Rol | Uso |
|-------|-----|-----|
| `laboraplus88@gmail.com` | **superadmin** | Admin global · todos los labs · `/admin-global` |
| `jefatura@labflow.msp.gob.ec` | **jefa** | Demo laboratorio C.S. El Paraiso · `/admin-lab` |

Cuentas demo opcionales (crear en Auth + seed):

| Email | Rol | Password sugerida |
|-------|-----|-------------------|
| tecnologo@labflow.msp.gob.ec | tecnologo | Lab2026!Tecn |
| muestras@labflow.msp.gob.ec | toma | Lab2026!Toma |
| medico@labflow.msp.gob.ec | medico | Lab2026!Medi |

Password jefa demo: `Lab2026!Jefa` (la de superadmin la defines al crear el user en Auth).

## Orden

1. Authentication → Users → crear cada email (Auto Confirm)
2. Ejecutar `seed_roles.sql`
3. Si usas multi-tenant: `04_multitenant.sql` antes o con laboratories ya creados

## Quién crea a quién

- **superadmin**: crea jefas de lab (`create_lab_admin`)
- **jefa**: asigna tecnologo / toma / medico de su lab (`assign_staff_to_lab`)
- Registro público en la app: solo **medico**
