# AGENTS.md

Contexto del proyecto para agentes de código. Léelo antes de modificar algo.

## Qué es

**Wispi Portal** (`odoo-portal-19`, repo `portal-xcien`): portal de vendedores de Wispi · XCIEN. Los vendedores inician sesión con su cuenta de Odoo y gestionan solicitudes (leads/oportunidades de CRM), clientes y cotizaciones.

Es solo el frontend. No tiene base de datos ni lógica de negocio propia: todo vive en Odoo 19 y se consume por la API REST del módulo `wispi_portal_api`.

- Idioma de la UI, de los comentarios y de los mensajes de commit descriptivos: **español**.
- Los identificadores de código van en inglés o español según el dominio (`solicitud`, `cotizacion`, `apiFetch`); respeta el que ya use el archivo.

## Stack

| Pieza | Versión / detalle |
| --- | --- |
| Next.js | 16.1.6, App Router, Turbopack |
| React | 19.2.3 |
| TypeScript | 5, `strict: true` |
| Estilos | Tailwind CSS 4 + daisyUI 5 (temas vía `@plugin` en `app/globals.css`) |
| Iconos | `lucide-react` |
| Animación | `framer-motion` (solo `CurtainTransition`), `tw-animate-css` |
| Mapas | Leaflet 1.9.4 cargado por CDN (unpkg) en `MapPicker`; geocodificación con Nominatim |
| Lint / formato | Biome 2.2.0 (no hay ESLint ni Prettier) |

`@heroui/*` está en `package.json` pero no se importa en ningún archivo. No hay shadcn instalado aunque exista `components.json`.

## Comandos

```bash
npm run dev      # servidor de desarrollo en http://localhost:3000
npm run build    # build de producción
npm run start    # sirve el build
npm run lint     # biome check
npm run format   # biome format --write
npx tsc --noEmit # verificación de tipos
```

- Hay `package-lock.json` y `pnpm-lock.yaml` versionados. Si agregas o quitas dependencias, actualiza ambos o pregunta cuál se conserva.
- **No hay tests** ni framework de pruebas configurado. La verificación es `tsc`, `biome` y probar en el navegador.
- Estado actual: `tsc --noEmit` pasa limpio; `biome check` reporta ~190 errores y ~110 advertencias preexistentes (en su mayoría formato y `noExplicitAny`). No los corrijas en masa dentro de un cambio no relacionado; solo evita agregar nuevos en lo que toques.

## Variables de entorno

`.env.local` (no versionado):

```
NEXT_PUBLIC_ODOO_API_BASE=https://<host-odoo>/api/portal
```

Si falta, `next.config.ts` usa `https://qa.wispi.cloud/api/portal`. Del valor se deriva también el host de Odoo (sin `/api/portal`) para el rewrite del logo.

## Estructura

```
app/
  layout.tsx                  Root: fuentes, ThemeProvider > ToastProvider > CurtainProvider
  page.tsx                    Login (ruta "/")
  error.tsx, global-error.tsx
  globals.css                 Temas daisyUI + utilidades de marca
  (dashboard)/
    layout.tsx                Shell: Sidebar + TopBar + NotificationBell
    dashboard/page.tsx        Inicio
    solicitudes/page.tsx      Listado con filtros y paginación
    solicitud/nueva/page.tsx  Alta por pasos (stepper)
    solicitud/[id]/page.tsx   Detalle, edición, avance de etapa, marcar perdida
    solicitud/[id]/cotizacion/page.tsx   Cotizaciones de la solicitud
  components/
    ThemeProvider.tsx         useBrandTheme()
    ToastContext.tsx          useToast()
    ui/                       Componentes compartidos
  lib/
    api.ts                    apiFetch, ApiError, SESSION_COOKIE, getCookie
    geo.ts                    geocodeCityState, parseLatLng
proxy.ts                      Guard de sesión (el "middleware" de Next 16)
next.config.ts                Rewrites hacia Odoo
```

Archivos vacíos o de relleno, sin uso real: `app/components/ui/NavBar.tsx`, `app/hooks/index.ts`, `app/modules/planes/index.ts`, `app/modules/solicitud/index.ts`, `app/api/auth/route.ts`, `app/(dashboard)/solicitud/page.tsx`.

Las páginas de `solicitud/` son archivos grandes (950–2000 líneas) con el estado, las llamadas y el JSX en un mismo componente cliente. Sigue ese patrón al modificar; no las partas en módulos salvo que se pida.

## Comunicación con Odoo

Todo pasa por `apiFetch` de `app/lib/api.ts`. No uses `fetch` directo contra `/api/portal` (la única excepción existente es el login en `app/page.tsx`).

```ts
import { apiFetch, ApiError } from "@/app/lib/api";

const data = await apiFetch<{ items: Item[] }>("/solicitudes?limit=6", { company: true });
await apiFetch(`/solicitudes/${id}/update`, { method: "POST", body: payload, company: true });
```

Reglas que no deben romperse:

1. **Proxy same-origin.** El navegador llama a `/api/portal/*` en el propio origen y `next.config.ts` lo reenvía a Odoo. `/logo.png?company=<id>` se reenvía a la ruta nativa de Odoo.
2. **Sin cabeceras personalizadas.** La sesión y la compañía viajan como query params `_sid` y `_cid`, y el cuerpo se envía como `text/plain` con JSON dentro. Así la petición es "simple" y no hay preflight CORS. No agregues `Authorization`, `X-*` ni `Content-Type: application/json` en `apiFetch`.
3. **`company: true`** agrega `_cid` desde la cookie `company_id`. Úsalo en todo endpoint que dependa de la compañía activa.
4. **Errores.** `apiFetch` lanza `ApiError` cuando la respuesta trae `{ success: false }`; `err.validation` indica error de validación de Odoo. Muestra `err.message` con `useToast().error(...)`.
5. **Sesión expirada.** Un 401, un 303 o una respuesta no-JSON borran la cookie y redirigen a `/?expired=1`. No dupliques ese manejo en las páginas.
6. **Timeout** de 60 s; se puede pasar un `signal` para cancelar.

### Cookies

| Cookie | Uso |
| --- | --- |
| `portal_sid` | sid de sesión de Odoo. La lee `proxy.ts` para proteger rutas. |
| `company_id`, `company_name` | Compañía activa (`_cid`, logo y nombre en el Sidebar). |
| `user_name`, `user_email` | Datos del usuario para la UI. |
| `app_theme` | Tema elegido (1 año). |

La cookie de sesión **no puede llamarse `session_id`**: ese nombre lo usa Odoo con `HttpOnly` y, al ser same-origin por el rewrite, JS no podría borrarla y el logout fallaría. El nombre está duplicado a propósito en `proxy.ts` y en `app/lib/api.ts`; si cambia, cambia en los dos.

### Rutas protegidas

`proxy.ts` redirige a `/` (con `?next=`) cuando no hay `portal_sid` en `/dashboard`, `/solicitud`, `/solicitudes` y `/configuracion`, y manda a `/dashboard` si ya hay sesión en `/`. Al crear una sección nueva dentro de `(dashboard)`, agrega su prefijo al arreglo `PROTECTED`.

`/configuracion` aparece en el Sidebar deshabilitada y todavía no tiene página.

### Endpoints en uso

`/login`, `/logout`, `/me`, `/notifications`, `/states`, `/cities`, `/regimenes`, `/products`, `/customers`, `/customers/:id/sites`, `/customers/:id/contacts` (+ `/create`), `/partners/:id/related`, `/lost_reasons`, `/lost_subreasons`, `/leads/:id/lost`, `/solicitudes`, `/solicitudes/opportunity`, `/solicitudes/:id` (+ `/update`, `/delete`, `/advance`, `/opportunities`, `/quotations`), `/quotations/:id` (+ `/cancel`, `/send`), `/quotation_templates`, `/subscription_plans`, `/analytic_accounts`.

### Backend

El módulo Odoo está fuera de este repo, en `../wispi/wispi_portal_api/` (controlador único: `controllers/main.py`). Todas las rutas son `type='http'`, `csrf=False`, `cors='*'` y, salvo `/login`, `auth='user'`. Si un cambio de frontend necesita un endpoint o campo nuevo, hay que modificarlo ahí; avisa al usuario en lugar de asumir que ya existe.

## Convenciones de código

- **Componentes cliente por defecto.** Casi todo lleva `"use client"`; solo son de servidor los layouts y `dashboard/page.tsx`. Cualquier archivo que use hooks, `apiFetch`, cookies o `window` necesita la directiva.
- **Imports.** Alias `@/*` apunta a la raíz del repo, así que las rutas son `@/app/lib/api`, `@/app/components/ui/...`. Los alias de `components.json` (`@/components`, `@/lib`) **no existen**; no los uses.
- **Formato.** 2 espacios, comillas dobles, punto y coma (Biome). Biome organiza los imports.
- **Tipos.** Las respuestas de Odoo se tipan de forma laxa (`any` es común). Tipa lo nuevo cuando sea barato, sin refactorizar lo existente.
- **Navegación con transición.** Para saltos "grandes" (login, logout) se usa `useCurtainTransition().runTransition(() => router.push(...))`.
- **Notificaciones.** `useToast()` expone `success`, `error`, `info` y `toast(msg, type)`.

## Estilos y diseño

- **Usa siempre tokens de daisyUI** (`bg-base-100`, `text-base-content/60`, `border-primary/25`, `text-error`…). Nada de colores fijos (`bg-zinc-900`, hex): hay 8 temas (`dark` —"Wispi", el predeterminado—, `dim`, `obsidian`, `aurora`, `dracula`, `ivory`, `cupcake`, `retro`) y todo debe verse bien en claros y oscuros.
- El login fuerza el tema `dark`; el resto respeta la cookie `app_theme`.
- Un tema nuevo se agrega en dos lugares: bloque `@plugin "daisyui/theme"` en `globals.css` y el tipo/arreglo de `ThemeProvider.tsx`.
- Utilidades de marca definidas en `globals.css`; reutilízalas antes de escribir clases nuevas:
  - Jerarquía de CTA: `.btn-brand` (primario, **uno por vista**), `.btn-cta-secondary`, `.btn-cta-tertiary`, `.btn-cta-danger`.
  - Selección: `.chip-selected` (nav activo, filtros, tabs; nunca relleno sólido).
  - Elevación: `.elevate-1/2/3`, `.elevate-glow`.
  - Otras: `.card-premium`, `.avatar-chip`, `.custom-scrollbar`, `.skeleton-shimmer`, `.stripe-brand-3`, `.animate-slide-in-up`, `.animate-slide-in-right`.
- Tipografía: Geist para texto, Space Grotesk (`--font-display`) aplicada globalmente a `h1`–`h4`. Etiquetas y botones usan mayúsculas con `font-black` y `tracking` amplio.
- El scroll vive en el contenedor de contenido de `(dashboard)/layout.tsx`, no en `window`; tenlo en cuenta para `sticky` y para listeners de scroll.
- La UI es responsive con sidebar móvil (`MobileSidebarContext`); revisa los cambios en ancho de teléfono.

## Git

- Rama principal: `main`.
- Mensajes con prefijo tipo Conventional Commits (`feat:`, `fix:`, `imp:`, `refactor`), en español o inglés.
- `.env*`, `.next/`, `node_modules/` y `*.tsbuildinfo` están ignorados; no los versiones.
