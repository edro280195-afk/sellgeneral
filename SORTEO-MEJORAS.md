# PRIORIDAD 1: Flujo de Creación + Vista Live

## Propuesta deMejora

### Problema Actual
- Wizard de 3 pasos en página separada (desktop-first)
- No optimizado para mobile
- No existe vista pública para Facebook Live
- Drawer/modal para crear sorteos no existe

### Solución Propuesta

| Antes | Después |
|-------|--------|
| Página con wizard de 3 pasos | Drawer/Modal desde lista |
| Diseño desktop-first | Mobile-first touch-friendly |
| Sin vista live | `/live/:id` pública para broadcast |

### Arquitectura URLs
```
/admin/raffles         → Lista principal (existe)
/admin/raffles/new     →Modal drawer (CREAR)
/admin/raffles/:id     →Página detalle (solo admin)
/live/:id              → VISTA PÚBLICA para Facebook Live
```

---

## Wireframes

### 1. Drawer de Creación (Mobile)
```
┌─────────────────────────────┐
│  ← Nuevo Sorteo    [X]   │
│  ──────────────────────── │
│  Paso 1/3: Datos       │
│  ●━━━○━━━○             │
│                          │
│  Nombre del sorteo      │
│  [_________________]   │
│                          │
│  Premio/Descripción   │
│  [_________________]   │
│                          │
│  # Ganadoras           │
│  [1]  [2]  [3]         │
│                          │
│  [Siguiente →]         │
└─────────────────────────────┘
```

### 2. Vista Live (Broadcast)
```
┌─────────────────────────────┐
│      ░░░ REGI BAZAR ░░░       │
│  ─────────────────────────  │
│                              │
│        ⏰ 05:32            │  ← Timer countdown
│                              │
│    ╭───────────────────╮  │
│    │    ANIMACIÓN        │   │  ← ruleta/slot/etc
│    │    CENTRAL         │   │     (full width)
│    ╰───────────────────╯  │
│                              │
│   👑 Ana  👑 Maria  👑      │  ← TOP 3 preview
│                              │
│   Nuevo Laredo, NL          │
│   #RegiBazar               │
└─────────────────────────────┘
```

---

## Tasks Técnicos

| # | Task | Archivo |
|---|------|---------|
| 1 | Crear componente `live-view.component.ts` | `src/app/features/live/` |
| 2 | Agregar ruta `/live/:id` (pública, sin auth) | `src/app/app.routes.ts` |
| 3 | Reescribir `raffle-detail` como drawer/modal | `src/app/features/admin/raffles/` |
| 4 | Añadir timer countdown | `live-view.component.ts` |
| 5 | Integrar animaciones existentes | `live-view.component.ts` |
| 6 | Botón "Ir a Live" en detail actual | `raffle-detail.component.ts` |

---

## Flujo Live

1. **Admin crea sorteo** → status: "Draft"
2. **Admin activa** → status: "Active"
3. **Admin abre vista live** → muestra timer + participantes
4. **Admin da "Iniciar"** → animación corre
5. **Sistema selecciona winner** → animation reveal
6. **Admin confirma** → status: "Completed"
7. **Vista muestra winner + botón compartir**

---

## ¿Aprobado?

---

## RESUMEN: Implementado ✅ PRIORIDAD 1

### Tasks Completados

| # | Task | Status |
|---|------|--------|
| 1 | Crear `live-view.component.ts` | ✅ |
| 2 | Agregar ruta `/live/:id` | ✅ |
| 3 | Timer countdown | ✅ |
| 4 | Integrar animaciones | ✅ |
| 5 | Botón "Ir a Live" | ✅ |
| 6 | Build | ✅ |

---

### Archivos Modificados/Creados

1. **nuevo:** `src/app/features/live/live-view/live-view.component.ts`
   - Vista pública para Facebook Live
   - Branding REGI BAZAR visible
   - Timer countdown
   - Preview participantes TOP 3
   - Integración con animaciones existentes
   - Botones admin (Iniciar, Anunciar, Descargar)
   - Diseño mobile-first

2. **modificado:** `src/app/app.routes.ts`
   - Ruta `/live/:id` pública

3. **modificado:** `src/app/features/admin/raffles/raffle-detail/raffle-detail.component.ts`
   - Botón "📺 Live" en header

---

## Pendiente

- Reescribir Raffle Detail como drawer/modal (para después)

---

## SIGUIENTE: PRIORIDAD 2 - Animaciones Premium

## Propuesta

### Animaciones actuales:
1. **Ruleta** - Canvas con names en wedges
2. **Slot** - 3 columnas con names
3. **Eliminación** -grid de cards que se tachan
4. **Confetti** - Solo efecto final

### Mejoras propuestas:

| # | Mejora | Descripción |
|---|-------|-----------|
| 1 | **Efectos de sonido** | Sonido de ruleta girando, tickticktick, winner sound |
| 2 | **Partículas的高级** | Más effects tipo金光, sparkle trails |
| 3 | **Transiciones fluidas** | Easing mejorado, blur effects |
| 4 | **Efecto "slow down"** | Ruleta decelerate dramático antes de stopped |
| 5 | **Loading state** | Animación de "mezclando" antes de iniciar |
| 6 | **Branding** | REGI BAZAR siempre visible en la animación |

---

## Wireframe mejorado

**Antes (actual):**
```
╭───────────────────╮
│  ruleta simple   │    ← solo la ruleta
╰───────────────────╯
```

**Después (propuesta):**
```
╭─────────────────────────────╮
│      ░░░ REGI BAZAR ░░░        │  ← branding
├─────────────────────────────┤
│                             │
│      ╭─────────────────╮    │
│      │   ruleta/con   │    │
│      │   PARTICLES   │    │    ← con effects
│      │   GLOW FX    │    │
│      ╰─────────────────╯    │
│                             │
│  🎵 sounds: tickticktick 🎵   │  ← audio
│                             │
│     [ INICIAR ] → [MANUAL]   │  ← botones
╰─────────────────────────────╯
```

---

## Plan técnico

### 1. Ruleta mejorada
- Agregar efecto de particle trail cuando gira
- Sonido de tick tick tick usando Web Audio API
- Decelerate dramático (ease-out cubic)
- Glow en el slice donde va a parar
- Mostrar REGI BAZAR en el centro

### 2. Slot machine mejorada
- Efecto de blur cuando gira rápido
-jackpot burst particles
- Sonido de cada columna stopping
- Winner sound cuando para

### 3. Eliminación mejorada
- Camera shake al eliminar
- Transition más dramática
- Zoom al final

### 4. Nuevo: Confetti explosion
- Múltiples orígenes de confetti
- Colores REGI BAZAR (pink, rose, gold)
- Duration más largo

---

## Tareas técnicas

| # | Tarea |
|---|------|
| 1 | Agregar AudioService para sonidos |
| 2 | Mejorar drawWheel() con particles |
| 3 | Agregar减速 (decelerate) animation |
| 4 | Agregar branding al centro |
| 5 | Mejorar slot blur effects |
| 6 | Enhanced confetti |

---

## ¿Aprobado?