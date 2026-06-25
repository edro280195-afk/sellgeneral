# Neni's App — Contexto del Proyecto

> **Repo:** este es `sellgeneral` (frontend) de la plataforma **Neni's App** (la app SaaS multi-tenant). Regi Bazar es UNO de los tenants que la va a usar. El backend vive en `sellgeneral-api`. Los repos ORIGINALES (`regibazar-web` y `api/EntregasApi`) están **congelados y no se tocan**.

> **Nombre de plataforma:** Neni's App. Aplica en login, marketing, PWA shell, titulo de ventana y manifest. La marca de CADA tenant (Regi Bazar, Tienda Demo, etc.) sigue siendo per-tenant y se controla via FE-0 (kit de marca por tenant).

## Qué es
Plataforma SaaS multi-tenant de gestion de entregas para negocios de ventas en vivo por Facebook. El primer tenant es Regi Bazar. Los pedidos se capturan durante transmisiones en vivo ("Live Mode"), se gestionan en un tablero Kanban, y se entregan por un solo conductor con seguimiento en tiempo real. **Esta instancia frontend hoy es single-tenant** (un solo negocio, un solo conductor) — ver la sección "Single-tenant hoy".

## Arquitectura (dos repos)
```
C:\Codigos\sellgeneral\       → Frontend: Angular 21.2.1 (standalone + SSR/Express + PWA), Capacitor 8 (Android)
  ├── src/app/                → core/ · features/ (auth, admin, client, driver, live) · shared/
  ├── android/                → proyecto Capacitor (app del conductor)
  └── ARQUITECTURA-INVENTARIO.md · MIGRACION-DIAGNOSTICO.md  (fuente de verdad detallada)

C:\Codigos\sellgeneral-api\   → Backend: .NET 8, EF Core 8, PostgreSQL (Neon), SignalR
  ├── Controllers/ (20) · Models/ (~35) · Services/ (~37) · Hubs/ (5) · Migrations/ (75)
  └── Data/AppDbContext.cs    → 34 DbSets
```

## Stack específico (real)
- **Frontend:** Angular **21.2.1** (standalone components), **SSR** (Angular SSR + Express), **PWA** (service worker), **Capacitor 8** (Android). Tailwind CSS 4, Angular CDK drag-drop, `@microsoft/signalr ^10`, `@angular/google-maps`, `@mercadopago/sdk-js`.
- **Backend:** **.NET 8**, Entity Framework Core 8, SignalR. Desplegado en **Render**.
- **Base de datos:** **PostgreSQL en Neon** (`*.neon.tech`) — **NO Render**.
- **Android:** Foreground Service para GPS (background-geolocation), empaquetado vía Capacitor.
- **Auth:** **JWT de 7 días, SIN refresh token** (no existe lógica de refresh).

## Autenticación (real)
- JWT Bearer (HMAC-SHA256), vigencia **7 días fija**, sin refresh.
- Claims del JWT: **solo** `userId` (NameIdentifier), `Email`, `Name`. **El rol NO viaja en el JWT.**
- El control de roles hoy es **solo en el frontend** (`authGuard` de Angular); el backend casi no usa `[Authorize(Roles=…)]`. Roles: `Admin`, `Driver`, `Scaner`.
- El interceptor de Angular inyecta `Authorization: Bearer` en **todas** las peticiones cuando hay token (las vistas públicas usan endpoints que no exigen el header; no hay lógica especial por ruta en el interceptor).
- Rutas públicas por **token de recurso** (sin login): `/pedido/:token` (`Order.AccessToken`), `/repartidor/:token` (`DeliveryRoute.DriverToken`), `/tanda-view/:token` (`Tanda.AccessToken`), `/live/:id` (`LiveSession.Id`).

## IA / voz (real)
- **Gemini** (`gemini-2.5-flash`) — IA central: parsing de voz en Live/POS, armado de ruta por voz, briefing de ruta, insights de BI, y el asistente **C.A.M.I.**
- **TTS:** principal **ElevenLabs** (`eleven_multilingual_v2`); **Google Cloud TTS como fallback**.
- **Transcripción:** **OpenAI Whisper** (`whisper-1`) para el audio de los lives.
- Geocoding y optimización de rutas con Google Maps (con fallback heurístico de vecino-más-cercano); imágenes en Cloudinary; push con FCM (Android nativo) y Web Push/VAPID (web/PWA).

## Base de datos
- PostgreSQL en **Neon**.
- Todas las fechas en **UTC** — nunca guardes DateTime sin zona.
- Entidad principal: `Order` (estados `Pending → InRoute → Delivered / Cancelled`).
- **Nomenclatura de tablas MIXTA (cuidado al escribir SQL):**
  - Mayoría en **PascalCase**, tabla y columnas: `Orders`, `Clients`, `OrderPayments` (`"Orders"."AccessToken"`).
  - Módulos de **Tandas** y **Sorteos** en **snake_case**: `tandas`, `tanda_participants`, `raffle_entries`, `raffle_participants` (columnas como `access_token`).
  - **Colisiones de nombre — tratar como entidades SEPARADAS:** `TandaProduct` mapea a la tabla **`products`** (≠ `Products`, el catálogo del POS); `TandaPayment` mapea a **`payments`** (≠ `OrderPayments`). En Postgres `products` ≠ `"Products"`.

## Single-tenant hoy
**El sistema es single-tenant: ninguna entidad tiene `BusinessId` / `TenantId` / `OwnerId`.** Toda la base pertenece implícitamente a un único negocio (Regi Bazar). El negocio está **hardcodeado**:
- El nombre **"Regi Bazar"** embebido en los prompts de Gemini (`GeminiService`).
- El dominio **`regibazar.com`** fijo en CORS y en `App:FrontendUrl`.
- El **depot / centro de ruta** fijo en **Nuevo Laredo** (`Cami:RouteCenterLat=27.4861`, `Lng=-99.5069`) y el bias de geocoding a "Nuevo Laredo, Tamaulipas".
- El **conductor es único**: se identifica por `DeliveryRoute.DriverToken`, no por un usuario con sesión.
- El registro más cercano a "config del negocio" es la fila singleton `AppSettings (Id=1)`.

> Volverlo **multi-tenant** (objetivo del proyecto sellgeneral) requiere: `BusinessId` en las raíces, filtros globales de EF (`HasQueryFilter`), claim de tenant en el JWT, y parametrizar todo lo hardcodeado. Eso es trabajo de las fases siguientes del plan — no está hecho aún.

## Convenciones específicas
- Los DTOs siempre terminan en `Dto` (ej. `OrderDto`, `CreateOrderDto`).
- Los servicios Angular terminan en `Service` y son `providedIn: 'root'`.
- Los componentes "página" viven en `features/.../` (admin, client, driver, live); los reutilizables en `shared/`.
- Hubs de SignalR (5): `TrackingHub`, `DeliveryHub`, `OrderHub`, `LogisticsHub`, `PosHub`.
- Los enums en C# y TypeScript deben sincronizarse **manualmente**.
- Las propiedades calculadas en entidades EF deben marcarse con `[NotMapped]`.

## Diseño UI — Tema "Coquette / Girly"
- Colores principales: rosas suaves, lavanda, blanco hueso (el rosa del negocio es `#FF0072`).
- Tipografía ligera (Poppins o similar); glassmorphism con tarjetas translúcidas.
- Íconos de Lucide o Material Icons.
- **Nunca uses colores corporativos azul/verde acá** — ese es el tema de PMM.

## Módulos principales
- **Live Mode / Live Capture:** captura de pedidos por voz/comentarios durante transmisiones (pipeline `yt-dlp → Whisper → Gemini`).
- **Kanban:** gestión visual de órdenes con drag-drop.
- **RouteView (conductor):** vista del conductor con mapa y lista de entregas.
- **RouteManager (admin):** vista de administrador para asignar y monitorear rutas.
- **OrderView (cliente):** link público para que la clienta rastree su pedido.
- **Tandas · Sorteos (Raffles) · POS · Lealtad (RegiPuntos) · Finanzas.**
- **C.A.M.I.:** asistente IA con Gemini para asistencia contextual.

## Comandos útiles
```bash
# Backend (.NET 8) — está en el repo hermano
cd ../sellgeneral-api && dotnet run

# Frontend (Angular 21)
ng serve

# Android
# Abrir android/ en Android Studio → Run
```
