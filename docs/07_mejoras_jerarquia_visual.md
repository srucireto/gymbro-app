# Mejoras de jerarquía visual - Sistema de diseño consistente

## Objetivo

Establecer un sistema de diseño consistente en todas las páginas usando componentes shadcn/ui, tipografía clara, espaciado uniforme y tokens semánticos.

---

## Principios aplicados

### 1. **Tipografía clara y consistente**

```
Página título:        text-3xl font-bold tracking-tight
Sección título:       text-xl font-semibold tracking-tight
Card título:          text-lg font-semibold
Subtítulo/descripción: text-sm text-muted-foreground
Body:                 text-base (default)
Labels pequeños:      text-xs uppercase tracking-wide font-semibold
```

### 2. **Espaciado sistemático**

```
Entre secciones principales:  mb-8, space-y-6
Entre cards:                  space-y-4
Dentro de cards:              space-y-3
Entre elementos inline:       gap-2, gap-3, gap-4
Padding de cards:             p-4, p-5
```

### 3. **Componentes shadcn/ui en lugar de divs personalizados**

**Antes:**
```tsx
<div className="bg-white rounded-lg border-2 border-gray-200 p-4">
  <h2 className="font-bold">Título</h2>
  <p className="text-gray-600">Descripción</p>
</div>
```

**Después:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Descripción</CardDescription>
  </CardHeader>
  <CardContent>
    ...
  </CardContent>
</Card>
```

### 4. **Tokens semánticos en lugar de colores directos**

**Antes:**
```tsx
<div className="bg-gray-50 text-gray-900">
<div className="bg-blue-50 border-blue-200">
```

**Después:**
```tsx
<div className="bg-background text-foreground">
<div className="bg-muted border-border">
```

### 5. **Botones consistentes**

```tsx
// Acción principal
<Button>Texto</Button>

// Acción secundaria
<Button variant="outline">Texto</Button>

// Acción terciaria / navegación
<Button variant="ghost">Texto</Button>

// Links importantes
<Button variant="link">Texto</Button>
```

---

## Cambios por página

### HomePage.tsx

**Header:**
- ✅ Título aumentado a `text-3xl font-bold tracking-tight`
- ✅ Botón "Rutinas" cambiado a `variant="outline"`
- ✅ Espaciado header aumentado a `mb-8`

**Card progreso:**
- ✅ Descripción con formato uppercase: `text-xs uppercase tracking-wide font-semibold`
- ✅ Título progreso mejorado: `text-3xl font-bold` con `/` en `text-muted-foreground`

**Selector de días:**
- ✅ Card con borde destacado: `border-2 border-primary shadow-md`
- ✅ Títulos simplificados y claros
- ✅ Descripción con "Paso X de 2"

**Botón cambiar partido:**
- ✅ Cambiado a `variant="outline"` para menos peso visual

**Calendario:**
- ✅ Header de sección con `text-xl font-semibold tracking-tight`

### RutinasPage.tsx

**Header:**
- ✅ Botón volver con `variant="ghost"` y margen negativo `-ml-2`
- ✅ Título `text-3xl font-bold tracking-tight`
- ✅ Subtítulo agregado: `text-muted-foreground`

**Card carga de rutina:**
- ✅ Convertido a Card con CardHeader y CardContent
- ✅ Input file mejorado con colores primarios

**Lista de rutinas:**
- ✅ Cada rutina es una Card con CardHeader
- ✅ Badge para "ACTIVA" usando componente shadcn
- ✅ Botón "Activar" con tamaño `sm`

**Estado vacío:**
- ✅ Convertido a Alert component

**Rutina activa:**
- ✅ Alert con colores verdes usando clases Tailwind (bg-green-50, border-green-200)

### DeloadPage.tsx

**Header:**
- ✅ Botón volver con `variant="ghost"` y margen negativo `-ml-2`

**Banner principal:**
- ✅ Convertido a Alert con layout flex
- ✅ Emoji como elemento separado con mejor alineación

**Instrucciones:**
- ✅ Convertida a Card con CardHeader y CardContent
- ✅ Cada instrucción con layout flex (emoji + contenido)
- ✅ Títulos con `font-semibold`, descripción con `text-muted-foreground`

**Próximos pasos:**
- ✅ Card con colores azules
- ✅ CardDescription con color apropiado
- ✅ Botón usando componente Button con `size="lg"`

### SesionDetailPage.tsx

**Header sticky:**
- ✅ Fondo con blur: `bg-background/95 backdrop-blur`
- ✅ Título aumentado a `text-2xl font-bold tracking-tight`
- ✅ Botón volver con `variant="ghost"`
- ✅ Badges mejorados con mejor padding y uso de `bg-muted`

**Cards de ejercicios:**
- ✅ Espaciado entre cards aumentado a `space-y-6`
- ✅ Card con sombra sutil: `shadow-sm`
- ✅ Padding interno aumentado: `p-5`

**Header del ejercicio:**
- ✅ Label "EJERCICIO X" con formato uppercase
- ✅ Título del ejercicio `text-lg font-bold`
- ✅ Grupo muscular con `text-muted-foreground`
- ✅ Botón video convertido a Button component con `variant="outline"`

**Meta info:**
- ✅ Borde inferior semántico: `border-b border-border`
- ✅ Labels con `text-muted-foreground`, valores con `text-foreground`

**Notas técnicas:**
- ✅ Botón convertido a Button component con `variant="ghost"`
- ✅ Contenido en Alert component con AlertDescription

**Tracking:**
- ✅ Label con formato uppercase y tracking wide
- ✅ Inputs mantienen estilo actual (funcionan bien en mobile)

---

## Mejoras en UX mobile

### Sticky header con blur
```tsx
className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border z-10"
```
- Header transparente con blur cuando se hace scroll
- Mejor sensación de profundidad

### Touch targets
- Botones con tamaño mínimo apropiado para mobile
- Padding generoso en cards (p-5)
- Espaciado entre elementos interactivos (gap-3)

### Legibilidad
- Títulos más grandes y con mejor tracking
- Contraste mejorado usando tokens semánticos
- Jerarquía clara: title > heading > body > caption

---

## Tokens de color usados

```tsx
// Fondos
bg-background        // Fondo principal
bg-card             // Fondo de cards
bg-muted            // Fondo suave para elementos secundarios

// Texto
text-foreground          // Texto principal
text-muted-foreground    // Texto secundario
text-primary             // Texto de acento

// Bordes
border-border           // Bordes normales
border-primary          // Bordes destacados

// Estados
bg-destructive          // Errores/acciones destructivas
bg-primary              // Acción principal
```

---

## Ventajas del nuevo sistema

### 1. **Mantenibilidad**
- Cambiar tema (light/dark) solo requiere actualizar tokens
- Componentes reutilizables reducen código duplicado
- Patrones consistentes facilitan agregar nuevas páginas

### 2. **Accesibilidad**
- Contraste apropiado usando tokens semánticos
- Jerarquía clara para lectores de pantalla
- Touch targets apropiados para mobile

### 3. **Escalabilidad**
- Fácil agregar nuevas secciones siguiendo los patrones
- Sistema de espaciado predecible
- Componentes shadcn/ui bien documentados

### 4. **Experiencia profesional**
- Diseño pulido y moderno
- Transiciones suaves (blur, hover states)
- Sensación de producto terminado

---

## Checklist de implementación

- [x] HomePage: Header, cards, selector, calendario
- [x] RutinasPage: Header, card carga, lista, estados
- [x] DeloadPage: Header, banner, instrucciones, próximos pasos
- [x] SesionDetailPage: Header sticky, cards ejercicios, tracking

---

## Próximas mejoras opcionales

1. **Dark mode**: El sistema de tokens ya está preparado, solo falta implementar el toggle
2. **Animaciones**: Agregar framer-motion para transiciones entre páginas
3. **Loading states**: Skeletons usando shadcn/ui Skeleton component
4. **Empty states**: Ilustraciones para estados vacíos
5. **Toasts**: Reemplazar `alert()` con shadcn/ui Toast component

---

**Fecha:** 2026-05-17
**Impacto:** Mejora significativa en consistencia visual y UX mobile
