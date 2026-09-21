# Sistema de Control de Servicio Social · CUTlaquepaque

Plataforma institucional del **Centro Universitario de Tlaquepaque (UdeG)** para reemplazar las listas impresas de asistencia de los prestadores de servicio social.

Tiene **dos portales completamente separados**, cada uno con su propio acceso, su propia sesión y su propio código:

| Portal | Ruta | Quién entra | Cómo entra |
| --- | --- | --- | --- |
| Portal del Estudiante | `/estudiante` | Prestadores registrados | Código o correo institucional + contraseña generada por la Coordinación |
| Portal Administrativo | `/admin` | Coordinación y responsables | Correo institucional **previamente registrado** + contraseña |

> Versión preliminar (fase 2). Pensada para presentarse y validarse con la Coordinación antes de su puesta en producción.

---

## Funcionalidades

### Portal del Estudiante
- **Registro de entrada y salida** con asistente:
  1. Fotografía de evidencia desde la cámara, con los datos del registro impresos en la imagen.
  2. Ubicación del dispositivo (si el estudiante la permite).
  3. Verificación biométrica (huella o rostro) si vinculó su dispositivo.
- La hora oficial es siempre **la del servidor**. Si la entrada es posterior a la tolerancia, el retardo se calcula solo.
- **Inicio**:
  - Tiempo en servicio en vivo y salida programada.
  - Horas cumplidas y restantes.
  - Fecha estimada de término según su horario.
  - Horario semanal y actividad reciente.
- **Historial**: filtros, fotografías de evidencia, observaciones de la Coordinación y descarga en CSV.
- **Perfil y seguridad**: datos registrados, responsable asignado, vinculación o baja de biometría y solicitud de nueva contraseña.
- **¿Olvidaste tu contraseña?**: la solicitud llega como notificación a la Coordinación. El estudiante no puede crear ni cambiar contraseñas.

### Portal Administrativo
- **Panel**:
  - Prestadores activos y quién está en servicio ahora.
  - Horas del día y gráfica de los últimos 14 días.
  - Mayor avance y actividad del día.
  - Alertas de pendientes.
- **Registro de prestadores** en tres pasos:
  1. Código, nombre, correo institucional, carrera y área.
  2. Horas requeridas, fecha de inicio, responsable y horario por día (con plantillas).
  3. Confirmación.

  Al terminar, el sistema **genera una contraseña segura** y muestra un **correo precargado** para enviarla.
- **Expediente del prestador**:
  - Avance, horario, último acceso y biometría.
  - Registros y **reporte imprimible con firmas**.
  - Generación de contraseña, desactivación y exportación CSV.
- **Asistencias**:
  - Filtros por periodo, prestador y estado.
  - **Revisión de evidencias** (validar o invalidar con observación).
  - Correcciones y capturas manuales con motivo.
  - Exportación CSV.
- **Notificaciones**:
  - Solicitudes de contraseña, con acción directa para generar y enviar la nueva.
  - Servicios completados, avances del 50 % y 90 %, retardos y registros sin salida.
- **Responsables** (solo administrador general): alta de correos institucionales con acceso, roles, generación de contraseñas y desactivación.
- **Alcance por rol**: cada responsable ve únicamente a los prestadores que tiene asignados; el administrador general ve todo.

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Portales | React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router (cada portal se carga por separado) |
| Animaciones | [React Bits](https://reactbits.dev): Threads, BlurText, RotatingText, GlareHover, AnimatedContent, SpotlightCard, CountUp, Counter, Stepper, ClickSpark; más Motion |
| API | Node.js + Express 5 + TypeScript (`tsx`) + Zod |
| Base de datos | SQLite integrado en Node (`node:sqlite`), sin instalaciones adicionales. El esquema es SQL estándar y se puede migrar a PostgreSQL o SQL Server |
| Biometría | WebAuthn / passkeys con `@simplewebauthn` (verificación en el servidor) |
| Correo | Nodemailer (SMTP). Sin SMTP, los correos se guardan en `server/data/outbox` |

Identidad visual: verde institucional, oliva y terracota del logotipo CUTLAQUE, con tipografía Montserrat e Inter.

---

## Puesta en marcha (desarrollo)

Requisitos: **Node.js 22.13 o superior**.

```bash
npm install
npm run dev
```

- Portales: http://localhost:5180
- API: http://localhost:4580 (configurable con `API_PORT`)

La primera vez que arranca, el servidor crea el **administrador general** con los datos de `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` del archivo `.env` (ver `.env.example`). La contraseña se guarda cifrada; si la base ya tiene administradores, esas variables se ignoran.

### Escudo oficial
Coloca el archivo del escudo de la UdeG en `public/brand/escudo-udg.png` y aparecerá automáticamente en los encabezados.

---

## Producción

```bash
npm run build
npm start
```

`npm start` sirve la API y los portales compilados desde el mismo servidor (puerto `PORT`).

Requisitos importantes:
- **HTTPS obligatorio**: la cámara, la geolocalización y la biometría solo funcionan en conexiones seguras (o en `localhost`).
- Configura `APP_ORIGIN` con la URL pública exacta (por ejemplo, `https://serviciosocial.cutlaquepaque.udg.mx`). La biometría queda ligada a ese dominio.
- Configura SMTP para enviar correos reales.
- Respalda periódicamente `server/data/`, que contiene la base de datos y las fotografías de evidencia.

---

## Seguridad implementada

- Contraseñas cifradas con **scrypt** y sal aleatoria. Solo los administradores generan contraseñas, que se muestran una sola vez.
- **Sesiones independientes por portal**: cookies distintas, `HttpOnly` y `SameSite=Strict`, almacenadas con hash en la base de datos. La cookie de un portal no abre el otro.
- Al generar una contraseña nueva o desactivar una cuenta, **se cierran todas sus sesiones**.
- Límite de intentos de inicio de sesión y de solicitudes de recuperación.
- Respuestas idénticas en la recuperación, para no revelar qué códigos existen.
- Validación de todos los datos en el servidor con Zod; las escrituras solo aceptan JSON.
- Fotografías validadas por firma de archivo y servidas solo a su dueño o a su responsable.
- Biometría con desafío de un solo uso verificado en el servidor. Los datos biométricos nunca salen del dispositivo.
- Bitácora (`audit_log`) de altas, contraseñas, correcciones, validaciones y envíos de correo.

---

## Estructura

```
shared/                 Contrato de datos y reglas compartidas (servidor y portales)
server/src/
  config.ts             Variables de entorno
  db/                   Esquema SQL, conexión y administrador inicial
  lib/                  Contraseñas, sesiones, evidencias, correo, límites
  middleware/auth.ts    Protección por portal y rol
  routes/               auth, student y admin/* (prestadores, asistencias, responsables, panel)
  services/             Lógica de asistencia, avance, notificaciones y biometría
src/
  portals/Landing.tsx   Portada institucional
  portals/student/      Portal del Estudiante (acceso, inicio, historial, perfil)
  portals/admin/        Portal Administrativo (panel, prestadores, asistencias, notificaciones, responsables)
  brand/                Logotipo, fondo animado y pantallas de acceso
  ui/                   Componentes de interfaz
  components/reactbits/ Componentes de React Bits (código editable)
```

## Próximos pasos sugeridos
- Integración con el directorio institucional o el SSO de la UdeG.
- Periodos escolares, cartas de asignación y liberación en PDF.
- Validación de ubicación contra el perímetro del centro universitario o del área asignada.
- Reportes por área y por periodo para la Coordinación.
