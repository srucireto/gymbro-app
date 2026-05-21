# Scripts de Rutinas

Scripts para gestionar rutinas en GymBro.

## Cargar Rutina desde JSON

Carga una rutina generada por Gemini (o manualmente) a la base de datos.

### Uso

```bash
npm run cargar-rutina <archivo.json> <user_id>
```

### Ejemplo

```bash
npm run cargar-rutina rutina-ppl.json abc123-def456-ghi789
```

### Parámetros

- **archivo.json**: Ruta al archivo JSON de la rutina
- **user_id**: ID del usuario en Supabase (puedes obtenerlo desde el dashboard)

### Obtener tu User ID

1. Ve a Supabase Dashboard → Authentication → Users
2. Encuentra tu usuario por email
3. Copia el UUID en la columna "ID"

O desde la consola del navegador en la app:

```js
const { data: { user } } = await supabase.auth.getUser()
console.log(user.id)
```

## Workflow Completo

### 1. Crear el JSON de la rutina

Crea un archivo JSON siguiendo la estructura documentada en `ESTRUCTURA_RUTINAS.md`.
Puedes usar `rutina-template.json` como referencia.

### 2. Guardar el JSON

Guarda la respuesta de Gemini en un archivo:

```bash
# Crea archivo con el JSON generado
nano mi-rutina-ppl.json
# Pega el JSON de Gemini
# Guarda con Ctrl+X, Y, Enter
```

### 3. Validar el JSON

Verifica que sea JSON válido:

```bash
# Usando jq (si está instalado)
jq . mi-rutina-ppl.json

# O usando Node
node -e "console.log(JSON.stringify(require('./mi-rutina-ppl.json'), null, 2))"
```

### 4. Cargar a la base de datos

```bash
npm run cargar-rutina mi-rutina-ppl.json TU_USER_ID
```

### 5. Verificar en la app

1. Abre la app: http://localhost:5173
2. Ve a "Rutinas"
3. Deberías ver tu nueva rutina listada
4. Actívala para empezar a usarla

## Troubleshooting

### Error: "Cannot find module 'tsx'"

Instala tsx:

```bash
npm install -D tsx
```

### Error: "VITE_SUPABASE_URL is not defined"

Crea un archivo `.env` con tus credenciales:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### Error: "Row Level Security policy violation"

El user_id proporcionado no existe o no tienes permisos. Verifica:

1. El user_id es correcto
2. El usuario existe en Supabase Auth
3. Las políticas RLS permiten la inserción

### Error: "Invalid JSON"

Valida tu JSON:
- Usa [jsonlint.com](https://jsonlint.com)
- Verifica comillas dobles (no simples)
- Verifica comas finales
- Verifica que los campos coincidan con el template

## Formato del JSON

Ver `rutina-template.json` para un ejemplo completo.

### Estructura mínima

```json
{
  "nombre": "Mi Rutina",
  "semanas_duracion": 6,
  "activa": true,
  "sesiones": [
    {
      "nombre": "Push A",
      "tipo": "push",
      "intensidad": "pesada",
      "buffer_minimo_horas": 48,
      "es_post_partido": false,
      "orden": 1,
      "ejercicios": [
        {
          "nombre": "Press banca",
          "grupo_muscular": "Pecho",
          "series": 4,
          "reps_target": "6-8",
          "rir_target": "1-2",
          "orden": 1
        }
      ]
    }
  ]
}
```

## Scripts Futuros

Próximas utilidades planeadas:

- `duplicar-rutina.ts`: Clonar una rutina existente
- `exportar-rutina.ts`: Exportar rutina de la DB a JSON
- `validar-rutina.ts`: Validar JSON antes de cargar
- `comparar-rutinas.ts`: Comparar diferencias entre rutinas
