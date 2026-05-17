# GymBro - Gestión de rutinas de hipertrofia

App para gestionar rutinas de gimnasio que se adaptan dinámicamente según el día del partido de futsal.

## Stack técnico

- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL + Auth + RLS)
- **Hosting:** Vercel
- **CI/CD:** GitHub → Vercel (automático)

## Documentación del proyecto

Toda la documentación se encuentra en la carpeta `docs/`:

- `01_rutina.md` - Rutina completa del Mesociclo 1
- `02_logica_semanal.md` - Los 7 escenarios por día de partido
- `03_objetivo_sistema_dinamico.md` - Algoritmo y estructura de datos
- `04_contexto_proyecto_app.md` - Stack, decisiones, schema, estado del proyecto

## Setup local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Luego edita `.env.local` con tus credenciales de Supabase:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

### 3. Ejecutar el schema de base de datos

Ve a tu proyecto en Supabase → SQL Editor y ejecuta el schema que se encuentra en `docs/04_contexto_proyecto_app.md` (sección "Schema de base de datos").

### 4. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La app estará disponible en `http://localhost:5173`

## Comandos disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Crea el build de producción
- `npm run preview` - Preview del build de producción
- `npm run lint` - Ejecuta ESLint

## Estructura del proyecto

```
/
├── docs/               # Documentación del proyecto
├── src/
│   ├── components/     # Componentes React reutilizables
│   ├── pages/          # Páginas/vistas de la app
│   ├── hooks/          # Custom hooks
│   ├── lib/
│   │   ├── supabase.ts    # Cliente de Supabase
│   │   └── scheduler.ts   # Algoritmo de scheduling
│   ├── types/
│   │   └── index.ts       # Tipos TypeScript
│   └── App.tsx
├── .env.example        # Template de variables de entorno
└── README.md
```

## Deployment

El proyecto se despliega automáticamente en Vercel cuando se hace push a `main`.

### Primera vez:

1. Conecta el repositorio de GitHub con Vercel
2. Configura las variables de entorno en Vercel
3. El deploy se ejecutará automáticamente

## License

MIT
