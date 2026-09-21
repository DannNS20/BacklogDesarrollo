# UniAccess · CUTlaquepaque

Sistema de control de acceso al Centro Universitario de Tlaquepaque mediante **check-in / check-out**
para alumnos, docentes, personal e invitados.

Proyecto de la materia **Seminario de Integración: Desarrollo** · 7.º de Informática.

El alcance, las historias de usuario y las decisiones de diseño están en [docs/ALCANCE.md](docs/ALCANCE.md).

---

## Dos portales separados

| Portal | Ruta | Quién entra | Cómo entra |
| --- | --- | --- | --- |
| Portal de acceso | `/acceso` | Alumnos, docentes y personal | Matrícula o correo institucional + contraseña, desde el celular |
| Portal institucional | `/control` | Vigilancia y administración | Correo institucional **previamente registrado** + contraseña |

Cada portal tiene su propia cookie de sesión y su propio paquete de código: iniciar sesión en uno no da acceso al otro.

---

## Qué hace

### Portal de acceso (celular)
- **Entrada y salida** como acciones separadas, confirmadas con la **biometría del propio teléfono** (huella o rostro, vía WebAuthn).
- **Geocerca opcional por acceso**: si la puerta tiene coordenadas, el registro solo procede estando cerca.
- Rechaza el registro y **alerta a vigilancia** cuando la credencial venció, está dada de baja, el rol no puede usar ese acceso o la persona está fuera del campus.
- Si marca salida sin tener entrada abierta, **se registra igual y queda como incidencia**; si ya registró la salida, avisa y no la duplica.
- Historial personal con filtros y descarga en CSV.
- Perfil con la credencial digital y la gestión de dispositivos biométricos.

### Portal institucional
- **Tablero en vivo**: quién está dentro del campus, con búsqueda y filtro por rol, actualizado cada 15 segundos.
- **Pases de invitado**: se emiten con motivo y anfitrión, registran la entrada, permiten reingreso el mismo día y se cierran al salir. Al día siguiente se rechazan por vencidos.
- **Registro manual de respaldo** para cuando el teléfono de la persona no puede registrar.
- **Alertas** de accesos denegados e incidencias, con marca de revisado.
- **Historial** con filtros por periodo, persona, acceso, rol y estado, y exportación a CSV.
- **Administración**: alta y baja de personas (la baja revoca el acceso y conserva el historial), accesos del campus con roles permitidos y geocerca, y operadores del sistema.

### Roles
- Personas: `alumno`, `docente`, `personal`.
- Operadores: `vigilancia` (operación diaria) y `admin` (todo, incluida la administración).

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Portales | React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router |
| Animaciones | [React Bits](https://reactbits.dev): Threads, BlurText, RotatingText, GlareHover, AnimatedContent, SpotlightCard, CountUp, Counter, ClickSpark; más Motion |
| API | Node.js + Express 5 + TypeScript (`tsx`) + Zod |
| Base de datos | SQLite integrado en Node (`node:sqlite`), sin instalar nada aparte. El esquema es SQL estándar y se puede migrar a PostgreSQL o SQL Server |
| Biometría | WebAuthn / passkeys con `@simplewebauthn`, verificadas en el servidor |
| Correo | Nodemailer (SMTP). Sin SMTP, los correos se guardan en `server/data/outbox` |

---

## Puesta en marcha

Requisitos: **Node.js 22.13 o superior**.

```bash
npm install
npm run dev
```

- Portales: http://localhost:5190
- API: http://localhost:4590 (configurable con `API_PORT`)

La primera vez, el servidor crea el **administrador inicial** con `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` del archivo `.env` (ver `.env.example`), además de tres accesos de ejemplo. Desde el portal institucional se dan de alta las personas y los demás operadores.

### Variables útiles

| Variable | Para qué sirve |
| --- | --- |
| `REQUIRE_BIOMETRIC` | `false` permite registrar acceso sin biometría (útil para demostraciones en computadora) |
| `ENFORCE_GEOFENCE` | `false` ignora la geocerca de los accesos |
| `APP_ORIGIN` | URL pública; la biometría queda ligada a este dominio |

---

## Producción

```bash
npm run build
npm start
```

El mismo servidor entrega la API y los portales compilados.

- **HTTPS es obligatorio**: la biometría y la ubicación solo funcionan en conexiones seguras (o en `localhost`).
- Configura `APP_ORIGIN` con la URL pública exacta.
- Respalda `server/data/`, que contiene la base de datos.

---

## Seguridad

- Contraseñas con **scrypt** y sal aleatoria; solo la administración las genera y se muestran una sola vez.
- **Sesiones independientes por portal**, con cookies `HttpOnly` y `SameSite=Strict` guardadas con hash.
- Las bajas y los cambios de contraseña **cierran todas las sesiones** de esa cuenta.
- Límite de intentos de inicio de sesión.
- Validación de toda la entrada con Zod; las escrituras solo aceptan JSON.
- Biometría con desafío de un solo uso verificado en el servidor; los datos biométricos nunca salen del dispositivo.
- Bitácora (`audit_log`) de altas, bajas, contraseñas, registros manuales y pases de invitado.

---

## Estructura

```
docs/ALCANCE.md         Historias de usuario, MoSCoW y reglas de negocio
shared/                 Contrato de datos y reglas compartidas
server/src/
  db/                   Esquema SQL, conexión y datos iniciales
  lib/                  Contraseñas, sesiones, correo, límites, fechas
  routes/               auth, person y staff/* (operación, personas, configuración)
  services/             Lógica de acceso, invitados, alertas y biometría
src/portals/
  Landing.tsx           Portada
  person/               Portal de acceso (celular)
  staff/                Portal institucional (vigilancia y administración)
```

## Fuera de este ciclo

Según la priorización MoSCoW del documento: los **reportes de afluencia por hora, día y tipo de usuario** (historia 10) quedan en el backlog y no se implementan en estas 10 semanas.
