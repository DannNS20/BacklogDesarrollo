# UniAccess · Paquete de Sprint Review

Paquete de preparación del Sprint Review del MVP de **UniAccess** (control de acceso al CUTlaquepaque
desde el celular de cada persona).

Materia: Seminario de Integración: Desarrollo · 7.º de Informática · CUTlaquepaque.

> Los nombres de los integrantes aparecen como **[Integrante A–D]**: sustitúyanlos por los reales antes de entregar.
> Las fechas son una propuesta y se confirman con los stakeholders en el Bloque 7.

## Contenido

1. [Contexto del sprint](#1-contexto-del-sprint)
2. [Mapa de stakeholders](#2-mapa-de-stakeholders-bloque-3)
3. [Evidencia de contacto](#3-evidencia-de-contacto)
4. [Formato y agenda del review](#4-formato-y-agenda-bloque-4)
5. [Guion de demo](#5-guion-de-demo-bloque-5)
6. [Herramienta de feedback](#6-herramienta-de-feedback)
7. [Video de respaldo](#7-video-de-respaldo-2-min)
8. [Dry-run y lista de mejoras](#8-dry-run-bloque-6)
9. [Plan de contingencia](#9-plan-de-contingencia)
10. [Plantilla de acta y plan de seguimiento](#10-plantilla-de-acta-y-plan-de-seguimiento)
11. [Cierre y compromisos](#11-cierre-y-compromisos-bloque-7)
12. [Trabajo en equipo](#12-trabajo-en-equipo)

---

## 1. Contexto del sprint

**Objetivo del sprint:** que una persona del campus pueda registrar su entrada y salida desde su propio
celular, confirmando su identidad con la biometría del teléfono, y que vigilancia sepa en tiempo real
quién está dentro y reciba alertas de intentos no autorizados.

**Incremento a revisar** (ver [ALCANCE.md](ALCANCE.md)):

| Historia | MoSCoW | Estado |
| --- | --- | --- |
| 1 · Alumno registra entrada | Must | Terminada |
| 2 · Alumno registra salida | Must | Terminada |
| 3 · Identificación por rol | Must | Terminada |
| 4 · Vigilancia ve quién está dentro | Should | Terminada |
| 5 · Invitado temporal | Should | Terminada |
| 6 · Alta y baja de usuarios | Must | Terminada |
| 7 · Alerta de acceso no autorizado | Could | Terminada |
| 8 · Historial con filtros y CSV | Should | Terminada |
| 9 · Historial personal | Could | Terminada |
| 10 · Reportes para directivos | Won't | Parcial (solo gráficas) |

**Qué queremos aprender del review:** si el registro desde el celular es aceptable para alumnos y
vigilancia, si las alertas son útiles o generan ruido, y qué priorizar para el siguiente sprint
(reportes descargables, integración con el directorio institucional o mejoras de operación).

---

## 2. Mapa de stakeholders (Bloque 3)

**Clasificación:** Negocio · Usuario · Técnico · Operaciones · Legal.
**Disponibilidad:** Día 1 (sesión presencial/híbrida) · Día 2 (asíncrono) · No puede.
**Tipo:** *Real* = persona que existe y se contacta · *Simulado* = rol representado por un proxy.

| # | Nombre / puesto | Tipo | Clasificación | Interés en UniAccess | Influencia | Disponibilidad | Proxy asignado | Canal | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Docente de la materia (Product Owner académico) | Real | Negocio | Que el incremento cumpla las historias y criterios de aceptación | Alta | Día 1 | — | Presencial + correo institucional | Confirmado |
| 2 | Coordinación de Seguridad y Accesos del CU | Real | Operaciones | Saber quién está dentro y reaccionar a alertas | Alta | Día 2 (asíncrono) | [Integrante C] en la sesión en vivo, con las preguntas que la coordinación envíe | Correo institucional + formulario | Invitación enviada |
| 3 | Guardia de vigilancia (turno matutino, acceso principal) | Real | Operaciones / Usuario | Que el tablero y los pases de invitado sean rápidos de usar | Media | Día 1 (15 min en la caseta, antes de la sesión) | — | En persona + WhatsApp | Por confirmar |
| 4 | Alumnos del CU (2–3 compañeros de otros semestres) | Real | Usuario | Registrar su entrada sin filas ni credencial física | Media | Día 1 | — | Grupo de WhatsApp + formulario | Confirmado |
| 5 | Docentes del CU (usuarios docentes) | Real | Usuario | Entrar por el acceso vehicular y que su rol se reconozca | Media | Día 2 (asíncrono) | Docente de la materia (#1) | Formulario | Encuesta enviada |
| 6 | Personal administrativo | Simulado | Usuario | Usar el acceso de servicios | Baja | No puede | [Integrante D] con el guion del flujo 2 | — | Proxy asignado |
| 7 | Área de TI del CU (Coordinación de Tecnologías) | Simulado | Técnico | Despliegue, HTTPS, red del campus, respaldo de la base | Alta | No puede | Líder técnico de otro equipo del seminario | Presencial (dry-run) | Proxy asignado |
| 8 | Unidad de Transparencia / Protección de datos personales | Simulado | Legal | Aviso de privacidad, geolocalización, que la biometría no salga del teléfono | Alta | No puede | [Integrante B], con la lista de verificación de datos personales (ver §6.4) | — | Proxy asignado |
| 9 | Secretaría Administrativa / Dirección del CU | Simulado | Negocio | Reportes de afluencia (historia 10) | Alta | No puede | Docente de la materia (#1) | — | Proxy asignado |
| 10 | Equipo invitado del seminario | Real | Usuario (público del dry-run) | Dar feedback cruzado | Baja | Día 1 (dry-run) | — | Presencial | Confirmado |

### Matriz poder / interés

| | **Interés bajo** | **Interés alto** |
| --- | --- | --- |
| **Influencia alta** | Mantener satisfecho: Dirección (#9), TI (#7) | Gestionar de cerca: Docente (#1), Coordinación de Seguridad (#2), Transparencia (#8) |
| **Influencia baja** | Monitorear: Equipo invitado (#10) | Mantener informado: Vigilancia (#3), Alumnos (#4), Docentes (#5), Personal (#6) |

### Reglas para los proxies

- El proxy recibe **antes** del review el guion del flujo, los datos de prueba y las preguntas de su stakeholder.
- En la sesión habla **"en nombre de"** y lo dice explícitamente ("Como Coordinación de Seguridad, me preocupa…").
- Todo lo que diga un proxy se registra en el acta con la marca **(proxy)** y se valida después con el stakeholder real por correo o formulario.

---

## 3. Evidencia de contacto

Se contacta como mínimo a **un stakeholder real (Coordinación de Seguridad, #2)** por correo y a los
**usuarios (#4 y #5)** con el formulario asíncrono. Las capturas se guardan en
`docs/capturas/sprint-review/` con los nombres indicados.

| Stakeholder | Medio | Fecha de envío | Respuesta | Captura |
| --- | --- | --- | --- | --- |
| Coordinación de Seguridad (#2) | Correo institucional | 03/11/2026 | Pendiente | `contacto-coordinacion.png` |
| Guardia de vigilancia (#3) | WhatsApp | 03/11/2026 | Pendiente | `contacto-vigilancia.png` |
| Alumnos (#4) y docentes (#5) | Google Form | 03/11/2026 | Pendiente | `formulario-enviado.png` |
| Docente de la materia (#1) | Correo institucional | 03/11/2026 | Pendiente | `contacto-docente.png` |

### 3.1 Correo a la Coordinación de Seguridad

> **Para:** coordinación de Seguridad y Accesos del CUTlaquepaque
> **Asunto:** Invitación · Revisión del sistema UniAccess (control de accesos desde el celular) · 12 de noviembre
>
> Buen día:
>
> Somos estudiantes de 7.º semestre de Informática del CUTlaquepaque. En el Seminario de Integración
> desarrollamos **UniAccess**, un sistema para registrar entradas y salidas del campus desde el celular de
> cada persona, sin lectores ni torniquetes. Vigilancia ve en tiempo real quién está dentro, emite pases
> para invitados y recibe alertas de intentos no autorizados.
>
> Nos gustaría conocer su opinión, porque su área sería la principal usuaria del portal institucional.
> Tenemos dos opciones:
>
> 1. **Sesión en vivo:** jueves 12 de noviembre, de 11:00 a 11:50, en el aula [salón] o por Google Meet: [enlace].
> 2. **Revisión asíncrona (10 minutos):** un video de 2 minutos y un formulario de 6 preguntas,
>    abiertos del 12 de noviembre a las 13:00 al viernes 13 de noviembre a las 18:00: [enlace al formulario].
>
> Si no le es posible participar, ¿podría indicarnos a alguien de su equipo que pueda hacerlo?
> Con gusto nos adaptamos a su horario.
>
> Gracias por su tiempo.
>
> [Integrante A] · en nombre del equipo UniAccess
> Seminario de Integración: Desarrollo · CUTlaquepaque

### 3.2 Mensaje de WhatsApp a vigilancia

> Buen día, somos alumnos de Informática del CU. Hicimos un sistema para que vigilancia vea quién está dentro
> del campus y registre invitados desde la computadora. ¿Nos regalaría 15 minutos el jueves 12 de noviembre
> a las 10:30 en la caseta del acceso principal para enseñárselo y escuchar qué le cambiaría? Gracias.

### 3.3 Mensaje para el grupo de alumnos y docentes

> Hola. Estamos probando **UniAccess**, una app para registrar tu entrada al CU con la huella o el rostro de tu
> celular. Te pedimos 5 minutos: mira el video de 2 minutos y responde el formulario. Tus respuestas definen
> qué hacemos en el siguiente sprint. Formulario: [enlace] · Abierto hasta el viernes 13/11, 18:00.

---

## 4. Formato y agenda (Bloque 4)

### 4.1 Formato elegido: **híbrido en dos jornadas**

| Jornada | Modalidad | Cuándo | Quién |
| --- | --- | --- | --- |
| Día 1 | Presencial en aula + transmisión por Google Meet (se graba) | Jueves 12/11/2026, 11:00–11:50 | Docente (#1), alumnos (#4), vigilancia (#3, visita previa 10:30), proxies (#2, #6, #7, #8, #9) |
| Día 2 | Asíncrono: grabación + video de 2 min + formulario | Del 12/11 13:00 al 13/11 18:00 | Coordinación de Seguridad (#2), docentes (#5) y quien no pudo asistir |

**Justificación (coherente con la disponibilidad del mapa):**

- Los stakeholders con más influencia y disponibilidad (docente, alumnos) pueden estar en el aula: la sesión presencial permite demo en vivo con celulares reales, que es la parte que más valor muestra (biometría y geocerca).
- La Coordinación de Seguridad y los docentes tienen horarios cruzados con clases y turnos: un review solo presencial los dejaría fuera. El Día 2 asíncrono les da 30 horas para responder.
- Vigilancia no puede abandonar la caseta: se va a su lugar de trabajo 20 minutos antes de la sesión.
- TI, Transparencia y Dirección no pueden participar en este ciclo: se cubren con proxies preparados y sus dudas se validan después por correo.

### 4.2 Agenda del Día 1 (50 min)

| Hora | Actividad | Responsable | Duración |
| --- | --- | --- | --- |
| 10:30 | Visita a la caseta: mini-demo del tablero y del pase de invitado con el guardia (#3) | [Integrante C] y [Integrante D] | 15 min |
| 10:50 | Preparación: servidor arriba, datos de prueba cargados, Meet abierto y grabando, celulares cargados | [Integrante D] | 10 min |
| 11:00 | Bienvenida y propósito del review: qué es UniAccess, qué esperamos de ellos, reglas del feedback | [Integrante A] | 5 min |
| 11:05 | Objetivo del sprint e incremento: historias terminadas, parciales y fuera de alcance | [Integrante A] | 5 min |
| 11:10 | Demo de 3 flujos críticos (ver §5) | [Integrante B] presenta · [Integrante D] opera | 15 min |
| 11:25 | Feedback estructurado: tarjetas de colores + votación por puntos + matriz valor/esfuerzo | [Integrante C] | 10 min |
| 11:35 | Cierre y próximos pasos: lectura de acuerdos, responsables, fecha del acta, enlace al formulario del Día 2 | [Integrante A] | 10 min |
| 11:45 | Margen para imprevistos | [Integrante A] | 5 min |

### 4.3 Agenda del Día 2 (asíncrono)

| Momento | Actividad | Responsable |
| --- | --- | --- |
| 12/11 · 13:00 | Publicar en el grupo y por correo: grabación, video de 2 min, formulario y resumen de acuerdos del Día 1 | [Integrante A] |
| 13/11 · 10:00 | Recordatorio a quien no ha respondido | [Integrante C] |
| 13/11 · 18:00 | Cierre del formulario | [Integrante C] |
| 16/11 · 12:00 | Consolidar feedback de ambos días y publicar el acta | [Integrante C] |

### 4.4 Roles internos

| Rol | Integrante | Responsabilidad |
| --- | --- | --- |
| Facilitador (Scrum Master) | [Integrante A] | Abre, controla tiempos, cierra y envía invitaciones |
| Presentador de la demo | [Integrante B] | Narra cada flujo con foco en el problema y el valor |
| Operador técnico (*driver*) | [Integrante D] | Maneja la laptop y los celulares, cuida el entorno y activa el plan de contingencia |
| Moderador de feedback y cronometrista | [Integrante C] | Reparte tarjetas, guía la votación, levanta la mano a los 2 minutos restantes |
| Secretario de acta | Rota: [Integrante C] Día 1 · [Integrante A] Día 2 | Llena el acta en vivo y la publica |

### 4.5 Canales

| Uso | Canal |
| --- | --- |
| Invitaciones formales | Correo institucional `@alumnos.udg.mx` |
| Recordatorios rápidos | Grupo de WhatsApp de stakeholders |
| Sesión en vivo | Aula [salón] + Google Meet (grabación en Drive del equipo) |
| Feedback asíncrono | Google Forms |
| Acuerdos y seguimiento | Issues de GitHub con la etiqueta `feedback-review` + acta en `docs/actas/` |

---

## 5. Guion de demo (Bloque 5)

**Principio:** mostrar **valor**, no pantallas. Tres flujos, uno por tipo de usuario principal. Lo demás
(administración de operadores, auditoría, ajustes de red, preferencias de lectura) no se muestra.

### 5.1 Flujos críticos

| Flujo | Usuario | Problema que resuelve | Qué se muestra | Datos |
| --- | --- | --- | --- | --- |
| 1 · Entrada y salida desde el celular | Alumna | Sin lectores ni torniquetes el campus no sabe quién entra; la credencial física se puede prestar | Login en `/acceso`, botón **Entrada** con huella/rostro y geocerca, confirmación con hora; después **Salida** con minutos dentro. Caso negativo: alumno con credencial vencida es rechazado | Ana López Ruiz · 2190345 · vigente; Luis Pérez Gómez · 2180112 · vencida |
| 2 · Vigilancia ve quién está dentro y recibe alertas | Guardia de vigilancia | Vigilancia no sabe cuánta gente hay ni detecta accesos indebidos | Tablero en vivo en `/control` que se actualiza solo con la entrada de Ana; un alumno intenta entrar por el **Acceso de servicios** (solo personal) y aparece la alerta "Área no permitida"; el guardia la marca como revisada | Guardia: vigilancia.demo@udg.mx; alumno Jorge Ramírez · 2201876 |
| 3 · Invitado temporal y registro de respaldo | Guardia de vigilancia | Proveedores y visitas no tienen cuenta; hay celulares sin biometría | Pase de invitado del día con motivo y anfitrión; registro manual por matrícula de una docente sin biometría; historial filtrado y exportación a CSV | Invitado Ing. Roberto Sánchez (proveedor); docente María Hernández · 2954321 |

### 5.2 Datos de prueba

Se cargan en una base limpia la noche anterior (`npm run dev` con `.env` de demo). Ninguno corresponde a una persona real.

**Configuración `.env` de demo**

| Variable | Valor | Motivo |
| --- | --- | --- |
| `REQUIRE_BIOMETRIC` | `true` en celular · `false` en la laptop de respaldo | Mostrar biometría real; tener plan B si falla |
| `SEED_ADMIN_EMAIL` | admin.demo@udg.mx | Administrador para dar de alta los datos |

**Accesos**

| Acceso | Roles permitidos | Geocerca |
| --- | --- | --- |
| Acceso principal | alumno, docente, personal | Coordenadas del aula de la demo, radio 300 m |
| Acceso vehicular | docente, personal | Sin geocerca |
| Acceso de servicios | personal | Sin geocerca |

**Personas**

| Nombre | Rol | Matrícula / código | Correo | Vigencia | Uso en la demo |
| --- | --- | --- | --- | --- | --- |
| Ana López Ruiz | alumno | 2190345 | ana.lopez@alumnos.udg.mx | 31/07/2027 | Flujo 1 (camino feliz) y aparece en el tablero |
| Luis Pérez Gómez | alumno | 2180112 | luis.perez@alumnos.udg.mx | 30/06/2026 (vencida) | Flujo 1 (rechazo) |
| Jorge Ramírez Torres | alumno | 2201876 | jorge.ramirez@alumnos.udg.mx | 31/07/2027 | Flujo 2 (alerta por rol) |
| María Hernández Silva | docente | 2954321 | maria.hernandez@academicos.udg.mx | 31/12/2027 | Flujo 3 (registro manual) |
| Carlos Méndez Ochoa | personal | 3012345 | carlos.mendez@udg.mx | 31/12/2027 | Relleno del tablero (ya dentro) |

**Operadores**

| Correo | Rol |
| --- | --- |
| admin.demo@udg.mx | admin |
| vigilancia.demo@udg.mx | vigilancia |

**Invitado:** Ing. Roberto Sánchez · Motivo: mantenimiento de aires acondicionados · Anfitrión: Coordinación de Servicios Generales.

**Estado inicial:** Carlos ya registró su entrada (el tablero no arranca vacío); Ana sin entrada abierta; Jorge sin entrada; ninguna alerta pendiente.

### 5.3 Guion detallado (15 min)

| Min | Quién | Acción en pantalla | Qué se dice |
| --- | --- | --- | --- |
| 0:00 | Presentador | Portada de UniAccess | "Hoy el CU no tiene lectores ni torniquetes. Vamos a ver tres momentos del día: una alumna que entra, un guardia que vigila y un proveedor que llega sin cuenta." |
| **Flujo 1** | | | |
| 0:30 | Operador | Celular proyectado: `/acceso`, login de Ana con su matrícula | "Ana entra con su matrícula y contraseña desde su propio celular." |
| 1:30 | Operador | Elige *Acceso principal* → **Entrada** → huella | "El teléfono confirma que es ella con su huella; la huella nunca sale del celular. Además verificamos que está dentro del campus." |
| 2:30 | Operador | Pantalla "Entrada registrada 11:12" | "En dos toques quedó registrada. Ya no hay que mostrar credencial." |
| 3:00 | Operador | Login de Luis (credencial vencida) | "¿Y si la credencial está vencida? El sistema lo rechaza y dice desde cuándo." |
| 3:40 | Presentador | Pregunta al público | "¿Esto les ahorraría tiempo en la entrada?" (respuesta rápida, sin debate) |
| **Flujo 2** | | | |
| 4:00 | Operador | Laptop: `/control` como vigilancia, tablero en vivo | "Esto ve el guardia. Ana acaba de aparecer sola, sin recargar. Hay dos personas dentro." |
| 5:00 | Operador | Filtra por rol *alumno* | "Puede filtrar por nombre o tipo de persona." |
| 5:40 | Operador | Celular: Jorge intenta entrar por *Acceso de servicios* | "Jorge intenta entrar por la puerta de servicios, que es solo para personal…" |
| 6:30 | Operador | Laptop: alerta "Área no permitida" → **Marcar como revisada** | "…y vigilancia recibe la alerta con el motivo. El guardia la atiende y queda registrado quién la revisó." |
| 7:30 | Presentador | Gráfica de afluencia por hora | "Las mismas entradas alimentan estas gráficas para planear turnos." |
| **Flujo 3** | | | |
| 8:30 | Operador | Pases de invitado → nuevo pase para Ing. Roberto Sánchez | "Llega un proveedor sin cuenta. El guardia le emite un pase válido solo hoy, con motivo y anfitrión." |
| 9:45 | Operador | Registro manual por matrícula 2954321 | "La maestra María tiene un celular sin biometría: vigilancia registra su entrada por matrícula. Nadie se queda afuera." |
| 11:00 | Operador | Historial → filtro de hoy → **Exportar CSV** | "Todo queda en un historial con filtros que se puede exportar." |
| 12:00 | Operador | Registra salida del invitado | "Al salir, el pase se cierra." |
| 12:30 | Presentador | Diapositiva "Qué falta" | "No incluimos reportes descargables para directivos ni integración con el directorio institucional. Queremos que ustedes nos digan qué priorizar." |
| 13:00 | Presentador | — | Margen de 2 min para preguntas de aclaración (las opiniones se guardan para el feedback) |

### 5.4 Checklist del operador (la noche anterior y 10 min antes)

- [ ] Base limpia con los datos de §5.2 y Carlos con entrada abierta.
- [ ] Celular de demo con huella registrada y dispositivo vinculado a Ana y a Jorge (un dispositivo por persona: usar dos celulares).
- [ ] Ubicación del celular activada y probada dentro del aula (precisión mejor que ±100 m).
- [ ] Laptop principal y laptop de respaldo con el repositorio actualizado y `npm install` hecho.
- [ ] Video de respaldo descargado en ambas laptops y en una USB.
- [ ] Hotspot del celular de [Integrante D] probado.
- [ ] Meet abierto, grabación iniciada, pantalla compartida con zoom al 125 %.

---

## 6. Herramienta de feedback

### 6.1 Presencial (Día 1): tarjetas + votación + matriz

**Paso 1 · Tarjetas (4 min).** Cada participante recibe *post-its* de tres colores y escribe una idea por tarjeta:

| Color | Pregunta |
| --- | --- |
| Verde | ¿Qué valor ven en lo mostrado? |
| Amarillo | ¿Qué falta o qué cambiarían? |
| Rosa | ¿Qué riesgo detectan (operativo, técnico, legal)? |

Las pegan en la pizarra bajo el flujo al que se refieren (1, 2, 3 o General). El moderador agrupa las repetidas en voz alta.

**Paso 2 · Votación por puntos (3 min).** Cada participante tiene **3 puntos** (calcomanías o marcas) para las tarjetas amarillas y rosas que más priorizaría. Pueden poner varios en la misma.

**Paso 3 · Matriz valor / esfuerzo (3 min).** El equipo coloca en vivo las 5 tarjetas más votadas; el esfuerzo lo estima el equipo y el valor lo confirman los stakeholders.

| | **Esfuerzo bajo** | **Esfuerzo alto** |
| --- | --- | --- |
| **Valor alto** | Hacer en el próximo sprint | Planear (dividir en historias) |
| **Valor bajo** | Si sobra capacidad | Descartar o posponer |

En Meet, los participantes remotos escriben sus tarjetas en el chat con el prefijo `VERDE:`, `AMARILLO:` o `ROSA:` y votan con reacciones; el moderador las pasa a la pizarra.

### 6.2 Asíncrono (Día 2): Google Form

**Título:** UniAccess · Revisión del sprint (5 minutos)
**Descripción:** Mira el video de 2 minutos [enlace] y responde. Tus respuestas deciden el siguiente sprint.

| # | Pregunta | Tipo | Opciones |
| --- | --- | --- | --- |
| 1 | ¿Cuál es tu relación con el CU? | Opción única (obligatoria) | Alumno · Docente · Personal administrativo · Vigilancia · Coordinación / directivo · Otro |
| 2 | ¿Qué tan útil te parece cada flujo? | Cuadrícula 1–5 | Filas: Entrada/salida desde el celular · Tablero y alertas de vigilancia · Pases de invitado y registro manual |
| 3 | ¿Qué valor ves en lo mostrado? | Párrafo | — |
| 4 | ¿Qué falta o qué cambiarías? | Párrafo | — |
| 5 | ¿Qué riesgo detectas? (privacidad, señal o batería del celular, filas, abuso…) | Casillas + Otro | Privacidad de la ubicación · Celular sin batería o sin datos · No tener biometría · Prestar el celular o la cuenta · Saturación en horas pico · Ninguno · Otro |
| 6 | ¿Qué priorizarías para el siguiente sprint? (elige máx. 2) | Casillas (validación: máx. 2) | Reportes descargables para directivos · Conexión con el directorio de la UdeG (SIIAU) · Registro con código QR como alternativa · Notificaciones a vigilancia en el celular · Aplicación instalable (PWA) sin conexión · Otro |
| 7 | ¿Usarías UniAccess todos los días en lugar de mostrar tu credencial? | Escala 1–5 | 1 = Nunca · 5 = Siempre |
| 8 | ¿Podemos contactarte para una prueba con usuarios? | Respuesta corta (opcional) | Correo institucional |

### 6.3 Del feedback al backlog

| Origen | Criterio | Destino |
| --- | --- | --- |
| Tarjeta con ≥ 3 votos o elegida por ≥ 30 % en la pregunta 6 | Valor alto | Nueva historia o ajuste en el Product Backlog, priorizada con el docente |
| Riesgo marcado por Seguridad, TI o Transparencia (aunque sea por proxy) | Siempre se revisa | Issue con etiqueta `riesgo` y responsable |
| Comentario aislado | Valor bajo | Se registra en el acta; se revisa en el siguiente refinamiento |

Cada acuerdo se convierte en un issue de GitHub con la etiqueta `feedback-review` y el número del acuerdo del acta.

### 6.4 Preguntas preparadas para los proxies

| Proxy de… | Preguntas que debe plantear |
| --- | --- |
| Coordinación de Seguridad (#2) | ¿Cuántas alertas por turno son manejables? ¿Quién da de baja a una persona al terminar su contrato? |
| TI (#7) | ¿Dónde se despliega con HTTPS (WebAuthn lo exige)? ¿Cómo se respalda la base SQLite? ¿Se puede limitar a la red del campus? |
| Transparencia (#8) | ¿Existe aviso de privacidad? ¿Se guarda la ubicación o solo se valida? ¿Cuánto tiempo se conserva el historial? ¿La biometría sale del teléfono? |
| Dirección (#9) | ¿Qué reporte necesitarían cada mes y en qué formato? |
| Personal administrativo (#6) | ¿El acceso de servicios funciona para proveedores recurrentes o necesitan un pase cada vez? |

---

## 7. Video de respaldo (2 min)

Se graba con la base de demo y se usa si falla el entorno o en el Día 2.

| Tiempo | Escena | Narración |
| --- | --- | --- |
| 0:00–0:15 | Portada y acceso del CU | Problema: sin lectores ni torniquetes, nadie sabe quién está dentro. |
| 0:15–0:50 | Celular: Ana registra entrada con huella; Luis rechazado por credencial vencida | Flujo 1: entrada en dos toques, identidad confirmada por el propio teléfono. |
| 0:50–1:25 | Laptop: tablero en vivo, alerta "Área no permitida", marcar como revisada | Flujo 2: vigilancia ve quién está dentro y atiende alertas. |
| 1:25–1:50 | Pase de invitado, registro manual, exportar CSV | Flujo 3: nadie se queda afuera y todo queda registrado. |
| 1:50–2:00 | Pantalla con el enlace al formulario | Invitación a dar feedback. |

Responsable de grabación y edición: [Integrante B]. Herramientas: grabador de pantalla del celular + OBS en la laptop. Archivo: Drive del equipo y USB.

---

## 8. Dry-run (Bloque 6)

### 8.1 Guion de 3 minutos

| Tiempo | Bloque | Quién | Contenido |
| --- | --- | --- | --- |
| 0:00–0:30 | Apertura y propósito | [Integrante A] | "Somos UniAccess. El CU no tiene torniquetes; con nuestra app cada persona registra su entrada desde su celular. Hoy queremos su opinión sobre si vigilancia y alumnos lo usarían." |
| 0:30–2:00 | Fragmento de demo | [Integrante B] narra · [Integrante D] opera | Flujo 1 (entrada de Ana con huella) y cómo aparece en el tablero de vigilancia (inicio del flujo 2) |
| 2:00–2:30 | Pregunta al público | [Integrante C] | "Con un punto cada uno: ¿qué les preocupa más, la privacidad de la ubicación o qué pasa si el celular no tiene batería?" |
| 2:30–3:00 | Cierre | [Integrante A] | "Gracias. El jueves 12 haremos el review completo y el formulario queda abierto hasta el viernes 13." |

El equipo invitado actúa como Coordinación de Seguridad y alumnos.

### 8.2 Lista de mejoras identificadas

Llenar durante y después del dry-run. Las filas marcadas *(previsto)* son mejoras que el equipo detectó en su ensayo interno.

| # | Mejora | Quién la detectó | Acción | Responsable | ¿Incorporada? |
| --- | --- | --- | --- | --- | --- |
| 1 | La apertura habla de tecnología (WebAuthn) antes que del problema *(previsto)* | Equipo (ensayo) | Empezar por "nadie sabe quién está dentro" y nunca decir "WebAuthn" | [Integrante A] | ☐ |
| 2 | El texto del celular proyectado no se lee *(previsto)* | Equipo (ensayo) | Proyectar el celular con espejo de pantalla y zoom; tema claro y texto grande en preferencias | [Integrante D] | ☐ |
| 3 | El login con contraseña consume tiempo de demo *(previsto)* | Equipo (ensayo) | Dejar sesiones iniciadas en ambos celulares antes de empezar | [Integrante D] | ☐ |
| 4 | La pregunta de feedback era abierta y nadie respondía *(previsto)* | Equipo (ensayo) | Usar preguntas cerradas o de elección | [Integrante C] | ☐ |
| 5 | | Equipo invitado | | | ☐ |
| 6 | | Equipo invitado | | | ☐ |
| 7 | **Punto fuerte (docente):** | Docente | Mantener | — | — |
| 8 | **Mejora (docente):** | Docente | | | ☐ |

---

## 9. Plan de contingencia

| # | Riesgo | Señal de activación | Plan B | Plan C | Responsable |
| --- | --- | --- | --- | --- | --- |
| 1 | Falla el internet del aula | Meet se congela o el celular no llega al servidor | La app corre local (Node + SQLite): laptop y celulares se conectan al **hotspot** de [Integrante D] | Demo desde la laptop con `REQUIRE_BIOMETRIC=false`; los remotos ven la grabación al terminar | [Integrante D] |
| 2 | Falla el entorno (servidor no arranca, error en la base, `npm` roto) | La app no carga en 1 minuto | Laptop de respaldo con el mismo repo y la base de demo ya cargada | **Video de respaldo de 2 min** + capturas de `docs/capturas/` narradas en vivo | [Integrante D] |
| 3 | Falla la biometría o la ubicación en el celular | El lector de huella no responde o la ubicación es más imprecisa que ±100 m | Segundo celular de demo ya vinculado | Cambiar a la laptop con `REQUIRE_BIOMETRIC=false` y quitar la geocerca del acceso principal; explicarlo como el "registro de respaldo" del flujo 3 | [Integrante D] |
| 4 | Stakeholder clave ausente (docente, Coordinación de Seguridad) | No llega a las 11:05 | El proxy asignado en §2 toma su lugar y lo anuncia | Se graba la sesión y se le envía el formulario; su voto se agrega al acta antes del 16/11 | [Integrante A] |
| 5 | Ningún stakeholder real responde la invitación | Sin respuesta al 10/11 | Segundo intento por otro canal (WhatsApp o visita a la oficina) | Review con proxies y formulario a alumnos; se documenta el intento como evidencia | [Integrante A] |
| 6 | Falla el proyector | No hay imagen a las 10:55 | Compartir pantalla en Meet y que los presentes se conecten desde sus celulares | Demo en la laptop girada hacia el público, en grupos | [Integrante D] |
| 7 | Integrante del equipo ausente | No llega a la preparación | Cada rol tiene suplente: A↔C, B↔D | El facilitador absorbe la narración | [Integrante A] |
| 8 | Se excede el tiempo | El cronometrista marca 2 min restantes y falta un flujo | Saltar al resumen del flujo 3 (solo el pase de invitado) | Mostrar el resto en el video del Día 2 | [Integrante C] |
| 9 | Datos de demo alterados por error | Aparecen registros que no deberían estar | Copia de la base de demo (`server/data/`) lista para restaurar | Continuar explicando el dato inesperado como parte del historial | [Integrante D] |
| 10 | Feedback dominado por una sola persona | Una persona habla más de 2 min | Volver a las tarjetas: "escríbalo y lo votamos" | Pasar al formulario | [Integrante C] |

**Regla de oro:** si algo falla, el operador avisa con una señal acordada (levanta la mano) y en **menos de 30 segundos** se pasa al plan B sin depurar en vivo.

---

## 10. Plantilla de acta y plan de seguimiento

Copiar esta plantilla a `docs/actas/AAAA-MM-DD-sprint-review.md` y llenarla en vivo.

### 10.1 Plantilla de acta

```markdown
# Acta · Sprint Review · UniAccess

| Campo | Valor |
| --- | --- |
| Sprint | |
| Fecha y hora | |
| Formato | Presencial / Híbrido / Asíncrono |
| Lugar o enlace | |
| Facilitador | |
| Secretario | |
| Grabación | (enlace) |

## Asistentes

| Nombre | Rol / stakeholder | Clasificación | Asistió como | Modalidad |
| --- | --- | --- | --- | --- |
| | | Negocio / Usuario / Técnico / Operaciones / Legal | Titular / Proxy de ___ | Presencial / Remoto / Asíncrono |

## Objetivo del sprint

(una línea)

¿Se cumplió? ☐ Sí ☐ Parcialmente ☐ No · Motivo:

## Incremento presentado

| Historia | Estado | Comentario de los stakeholders |
| --- | --- | --- |
| | Terminada / Parcial / No terminada | |

## Feedback recibido

| # | Tipo (valor / falta / riesgo) | Flujo | Comentario | Quién (marcar "proxy") | Votos |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

## Decisiones sobre el backlog

| Decisión | Historia afectada | Prioridad nueva |
| --- | --- | --- |
| | | |

## Acuerdos

| Acuerdo | Responsable | Fecha | Estado |
| --- | --- | --- | --- |
| | | | Pendiente / En curso / Hecho / Cancelado |

## Pendientes de validar con stakeholders reales (lo dicho por proxies)

| Tema | Stakeholder real | Canal | Fecha límite |
| --- | --- | --- | --- |
| | | | |

## Próximo review

Fecha tentativa: · Formato: · Invitados:

Firma o visto bueno del Product Owner: __________
```

### 10.2 Plan de seguimiento

| Cuándo | Qué | Responsable | Evidencia |
| --- | --- | --- | --- |
| Mismo día (12/11) | Pasar en limpio el acta del Día 1 y compartir el resumen de acuerdos en el grupo | Secretario | Mensaje en el grupo |
| 13/11 · 18:00 | Cerrar el formulario y exportar respuestas a hoja de cálculo | [Integrante C] | CSV de respuestas |
| 16/11 | Acta consolidada (Día 1 + Día 2) publicada en `docs/actas/` y enviada por correo a todos los stakeholders | [Integrante C] | Commit + correo |
| 16/11 | Un issue de GitHub por acuerdo, con etiqueta `feedback-review`, responsable y fecha | [Integrante A] | Issues enlazados en el acta |
| 17/11 | Refinamiento: priorizar con el docente las historias nuevas en el Product Backlog | Todo el equipo | Backlog actualizado |
| 17/11 | Enviar a cada stakeholder simulado (TI, Transparencia, Dirección) las preguntas que respondió su proxy, para validarlas | [Integrante B] | Correos enviados |
| Cada daily | Revisar el estado de los acuerdos abiertos (1 min) | [Integrante A] | Columna "Estado" del acta |
| Siguiente review | Abrir con "Lo que nos dijeron y lo que hicimos" | [Integrante A] | Diapositiva de trazabilidad |

**Indicadores de seguimiento**

| Indicador | Meta |
| --- | --- |
| Acuerdos con responsable y fecha | 100 % |
| Acuerdos cerrados antes del siguiente review | ≥ 80 % |
| Respuestas al formulario asíncrono | ≥ 10 |
| Stakeholders reales que participaron (en vivo o asíncrono) | ≥ 3 |
| Temas de proxies validados con el stakeholder real | 100 % antes del siguiente review |

---

## 11. Cierre y compromisos (Bloque 7)

### 11.1 Presentación del paquete en 2 minutos

| Tiempo | Contenido |
| --- | --- |
| 0:00–0:20 | Qué es UniAccess y objetivo del sprint |
| 0:20–0:50 | Stakeholders: 10 identificados, 5 reales, 5 con proxy; contacto enviado a Coordinación de Seguridad, vigilancia y usuarios |
| 0:50–1:15 | Formato híbrido en dos jornadas y por qué |
| 1:15–1:40 | 3 flujos críticos, feedback con tarjetas + votación + formulario |
| 1:40–2:00 | Contingencia (hotspot, laptop de respaldo, video) y fechas comprometidas |

### 11.2 Fechas comprometidas

| Hito | Fecha | Estado |
| --- | --- | --- |
| Invitaciones y formulario enviados | Martes 03/11/2026 | Hecho |
| Confirmación de asistencia de stakeholders | Lunes 09/11/2026 | Pendiente |
| Dry-run en clase | Martes 10/11/2026 | Pendiente |
| Video de respaldo grabado | Miércoles 11/11/2026 | Pendiente |
| **Sprint Review · Día 1 (presencial + Meet)** | **Jueves 12/11/2026, 11:00–11:50** | Por confirmar con stakeholders |
| **Sprint Review · Día 2 (asíncrono)** | **12/11 13:00 → 13/11 18:00** | Por confirmar |
| Acta consolidada publicada | Lunes 16/11/2026 | Pendiente |
| Refinamiento con el feedback | Martes 17/11/2026 | Pendiente |

### 11.3 Autoevaluación con la rúbrica

| Criterio | Puntos | Dónde está | ¿Listo? |
| --- | --- | --- | --- |
| Mapa de stakeholders completo y con evidencia de contacto | 20 | §2 y §3 | ☐ (falta pegar capturas) |
| Formato y agenda coherentes con disponibilidad | 20 | §4 | ☑ |
| Guion de demo enfocado en valor | 20 | §5 y §7 | ☑ |
| Herramienta de feedback accionable | 15 | §6 | ☑ |
| Plan de contingencia | 10 | §9 | ☑ |
| Dry-run y mejoras incorporadas | 10 | §8 | ☐ (llenar después del dry-run) |
| Acta y seguimiento | 5 | §10 | ☑ |

---

## 12. Trabajo en equipo

| Integrante | Rol en el review | Entregables que preparó | Suplente de |
| --- | --- | --- | --- |
| [Integrante A] | Facilitador | Agenda, invitaciones y correo a Coordinación de Seguridad, plan de seguimiento | [Integrante C] |
| [Integrante B] | Presentador | Guion de demo, video de respaldo, preguntas de Transparencia | [Integrante D] |
| [Integrante C] | Moderador de feedback y secretario | Herramienta de feedback, Google Form, plantilla de acta | [Integrante A] |
| [Integrante D] | Operador técnico | Datos de prueba, entorno de demo, plan de contingencia | [Integrante B] |

Todo el equipo: mapa de stakeholders (sesión conjunta), dry-run y consolidación del acta.
