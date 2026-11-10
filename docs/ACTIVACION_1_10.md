# Activación del incremento v1.10.0

Fecha de preparación: 2026-11-10.

Este incremento agrega roles editoriales, búsqueda global, métricas agregadas y cola
de correo. El código y las pruebas están completos. Para que producción los use hay
que aplicar cuatro migraciones y configurar el correo.

## Por qué no se aplicó automáticamente desde el entorno del proyecto

El entorno de trabajo tiene la `service_role` de Netlify, que permite operar la API
REST/PostgREST, pero **no ejecutar DDL**. La API de Management de Supabase rechazó
esa clave (`JWT failed verification`) y el pooler de PostgreSQL respondió
`password authentication failed`: falta la contraseña real de la base o un token de
Management. Esa credencial no está en el repositorio ni en las variables de Netlify.

No se debe confundir una clave publishable o `service_role` con la contraseña de
PostgreSQL. Nunca subir ninguna de ellas al repositorio.

## Opción A: automática desde una terminal autorizada

1. Obtener la cadena pooled desde Supabase → Project Settings → Database →
   Connection string → **Session pooler**.
2. Exportarla solo en la sesión de la terminal, sin persistirla en Git:

```sh
export SUPABASE_DB_URL='postgresql://postgres.<ref>:<password>@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
npm run db:apply -- --dry-run --from 202611100008
npm run db:apply -- --from 202611100008
```

También se puede guardar `SUPABASE_DB_URL=...` en `.env`; `npm run db:apply`
lo carga automáticamente y el archivo está excluido de Git.

El comando:

- crea `public.schema_migrations`;
- registra como baseline las migraciones 1 a 7 que ya estaban aplicadas;
- aplica en orden las migraciones 8 a 11;
- no reaplica una migración ya registrada;
- no imprime SQL ni credenciales.

Para un proyecto nuevo, usar `npm run db:apply -- --all`.

## Opción B: token de Management API

Si no tenés la contraseña de PostgreSQL, creá un **Personal Access Token** en
Supabase → Account → Access Tokens y cargalo en `.env`:

```env
SUPABASE_ACCESS_TOKEN=sbp_...
SUPABASE_PROJECT_REF=dzkcpsfmubwwguixtruu
```

Luego:

```sh
npm run db:apply:api -- --dry-run --from 202611100008
npm run db:apply:api -- --from 202611100008
```

El token de Management no es la `service_role` ni la clave publishable. No se imprime
en la salida y debe rotarse si se sospecha exposición.

## Opción C: SQL Editor

Abrir Supabase → SQL Editor y pegar el contenido completo de:

```text
supabase/activacion_20261110.sql
```

Aplicar una sola vez. No reejecutar las migraciones ya aplicadas.

## Variables de Netlify para correo

Configurar en **Site configuration → Environment variables → Production**:

```text
EMAIL_ENABLED=true
EMAIL_PROVIDER=brevo          # resend o smtp
EMAIL_FROM=<remitente verificado>
EMAIL_FROM_NAME=EEST N°3 Fragata Moyano
BREVO_API_KEY=<clave>         # o RESEND_API_KEY
# Para SMTP autenticado: EMAIL_SMTP_HOST, EMAIL_SMTP_PORT, EMAIL_SMTP_USER, EMAIL_SMTP_PASS
EMAIL_QUEUE_SECRET=<secreto largo>
```

La configuración SMTP interna de Supabase Auth no se reutiliza automáticamente:
la API de Management devuelve un secreto que no sirve como contraseña SMTP.
Usar una credencial de proveedor dedicada y verificar el remitente antes de activar.

Mantener `EMAIL_ENABLED=false` hasta probar la cola con datos técnicos. El endpoint
programado `/.netlify/functions/procesar-correo` se ejecuta cada cinco minutos.
También se puede disparar manualmente:

```sh
curl -X POST https://eest3sf.netlify.app/.netlify/functions/procesar-correo-manual \
  -H "x-queue-secret: <secreto>"
```

## Verificación posterior

En SQL Editor:

```sql
select to_regclass('public.email_outbox') as outbox,
       to_regclass('public.search_index') as busqueda,
       to_regclass('public.metrics_daily') as metricas,
       to_regclass('public.profile_role_history') as roles;

select count(*) from public.search_static;
select count(*) from public.search_index;

select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'metrics_daily'
order by ordinal_position;
```

La última consulta no debe mostrar `ip`, `session`, `user_agent`, `cookie` ni
`search_term`.

En la aplicación:

1. Ingresar a `gestion.html` → **Equipo editorial** y asignar un editor y un revisor.
2. Probar en `admin.html`: guardar borrador → enviar a revisión → aprobar → publicar.
3. Verificar `buscador.html` con filtros.
4. Verificar `gestion.html` → **Métricas** después de navegar por el sitio.
5. Enviar una consulta técnica y comprobar `email_outbox` y `email_events`.
6. Probar una baja con un token de prueba y cancelar el registro técnico.

## Reversión

Un deploy anterior no revierte las migraciones ni los datos. Para desactivar el
correo, poner `EMAIL_ENABLED=false`. Para retirar la interfaz nueva, desplegar un
commit anterior. No borrar tablas ni el historial como forma de rollback.
