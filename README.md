# Frente Cultura — Vercel + Supabase

Versión dinámica de la aplicación. Los datos quedan centralizados en Supabase y los cambios se actualizan en todas las computadoras y celulares conectados.

## 1. Crear el proyecto de Supabase

1. Entrá a https://supabase.com/dashboard y creá un proyecto.
2. Abrí **SQL Editor**, pegá todo el contenido de **supabase/schema.sql** y ejecutalo una sola vez.
3. Revisá **Project Settings > Integrations > Data API** y asegurate de que el esquema **public** esté expuesto.
4. Abrí **Authentication > Users** y creá tu usuario con correo y contraseña.
5. Volvé a **SQL Editor** y ejecutá, reemplazando el correo:

    insert into public.workspace_members (workspace_id, user_id, role)
    select '00000000-0000-4000-8000-000000000001', id, 'admin'
    from auth.users
    where email = 'TU-CORREO';

Para agregar otra persona, creá su usuario y repetí la consulta usando **editor** en vez de **admin**.

## 2. Configurar las variables

En Supabase, abrí **Project Settings > API** o **Connect** y copiá:

- Project URL
- Publishable key

Duplicá **.env.example** como **.env.local** y completá:

    NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_TU_CLAVE

No uses una **service_role** ni una secret key en estas variables.

## 3. Probar localmente

Requiere Node.js 22 o superior:

    npm install
    npm run dev

Abrí http://localhost:3000.

## 4. Subir a GitHub y Vercel

1. Creá un repositorio vacío en GitHub.
2. Subí esta carpeta al repositorio.
3. En https://vercel.com/new, importá el repositorio.
4. En **Environment Variables**, cargá las dos variables de **.env.example** con sus valores reales.
5. Presioná **Deploy**.

## Seguridad incluida

- El acceso requiere usuario de Supabase.
- Cada tabla tiene Row Level Security.
- Sólo miembros del espacio Frente Cultura pueden leer información.
- Sólo usuarios con rol **admin** o **editor** pueden modificarla.
- La clave pública funciona en el navegador porque los permisos reales se validan en la base.
- No hay ninguna clave administrativa incluida en el proyecto.

## Contenido inicial

- Los 16 integrantes del documento.
- Las 9 acciones divididas en las tres fases.
- La Peña militante del 17 de Octubre.
- Panel, equipo, plan, actividades, registro cultural e indicadores.

## Mapa cultural

La versión con mapa interactivo requiere ejecutar una vez en Supabase el archivo `supabase/mapa-cultural.sql`.
Luego, desde **Mapa cultural**, los registros de tipo espacio/organización/agrupación/colectividad/peña que todavía no tengan coordenadas pueden ubicarse seleccionando **Ubicar** y haciendo clic en el mapa.
El mapa usa OpenStreetMap y Leaflet desde CDN, por lo que necesita conexión a internet para mostrar las capas cartográficas.
