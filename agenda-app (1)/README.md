# Agenda Psicológica

## Variables de entorno

Creá un archivo `.env.local` (para probar en tu computadora) con:

```
NEXT_PUBLIC_SUPABASE_URL=https://ftrcxkdyvztoopubnnae.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_AFIObJ15TaRfPg2ryW451A_EbdrwH99
```

## Probar en tu computadora (opcional)

```
npm install
npm run dev
```

Abrí http://localhost:3000 — te va a pedir el email y contraseña que creamos en Supabase.

## Desplegar en Vercel

1. Subí esta carpeta a un repositorio de GitHub (o arrastrá la carpeta en vercel.com/new si no usás Git todavía).
2. En vercel.com → "Add New" → "Project" → importá el repositorio.
3. En "Environment Variables" agregá las mismas dos variables de arriba.
4. Deploy. Cuando termine, la URL que te da Vercel ya es tu app funcionando.
5. Desde el iPhone/iPad: abrí esa URL en Safari → botón compartir → "Agregar a pantalla de inicio". Va a comportarse como una app instalada.

## Qué incluye esta primera versión

- Login con el usuario que ya creamos en Supabase.
- Agenda: vista día, navegación entre fechas, marcar asistencia/pago, agendar turno nuevo.
- Administrar Pacientes: estado del tratamiento, pausar/cerrar tratamiento, notas clínicas.
- Análisis: KPIs del mes en curso y deudores.

## Pendiente para próximas iteraciones

- Vista semana y mes en la Agenda.
- Series recurrentes editables (cambiar frecuencia desde una fecha en adelante).
- Pausar tratamiento con fecha de reanudación automática.
- Gráficos de evolución y comparativas por período en Análisis.
- Multi-terapeuta (ya soportado por la base de datos, falta la pantalla de registro).
