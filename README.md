# Módulo Referentes - Frente Cultura

Este parche agrega una sección **Referentes** independiente del mapa cultural.

Permite:
- Importar el Excel `Contactos_Unificados_2025.xlsx` directamente desde la web.
- Listar y buscar referentes.
- Ver teléfono, disciplina y origen.
- Marcar si ya fue llamado/contactado y la fecha.
- Registrar **qué dijo**.
- Registrar **qué información brindó**.
- Registrar **seguimiento / próximo paso**.
- Conservar el estado y observaciones originales del Excel como referencia histórica.
- Evitar duplicados simples por nombre + teléfono al volver a importar el mismo Excel.

## Instalación
1. Copiar/descomprimir estos archivos dentro o junto al proyecto.
2. Desde PowerShell, parado en el proyecto, ejecutar el instalador.
3. Abrir `supabase/referentes.sql` y ejecutarlo en Supabase > SQL Editor.
4. Ejecutar `npm run dev`.
5. Entrar a **Referentes > Importar Excel** y elegir el archivo original.

El módulo no agrega estos referentes al mapa cultural.
