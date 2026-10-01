# PRD — Fase 2: Expansión Funcional de la Plataforma de Bienestar Organizacional

**Basado en:** PRD_Dashboard_Salud_Organizacional.md (v2.0) y MVP_Dashboard_Salud_Organizacional.md (v2.0)
**Autora:** Melissa Alejandra Chávez
**Estado:** Sin fecha límite fija — fase de expansión posterior al MVP funcional (completado al Día 9)
**Propósito de este documento:** servir como especificación y guía de construcción día a día para todo lo que se agrega a partir de aquí, de la misma forma en que el PRD/MVP originales guiaron los primeros 9 días.

---

## 1. Resumen de la expansión

El MVP actual sirve a un solo tipo de usuario: la dirección, que ve el dashboard ejecutivo. Esta fase introduce un **segundo tipo de usuario real dentro del sistema — el empleado —**, con su propio flujo de acceso, su propio espacio de trabajo, y mecanismos de organización por equipos. Además, se amplía el motor de encuestas para soportar múltiples encuestas activas simultáneamente segmentadas por departamento, se agrega un indicador de presencia/ausentismo digital, un kanban de seguimiento colaborativo, y capacidades de exportación y filtrado para el dashboard ejecutivo.

En conjunto, el sistema deja de ser "un dashboard que un director consulta" para convertirse en **una plataforma con dos experiencias**: la ejecutiva (ya construida) y la del colaborador (nueva).

---

## 2. Modelo de roles y usuarios

### 2.1 Roles del sistema

| Rol | Quién es | Qué ve al iniciar sesión |
|---|---|---|
| `admin` | Dirección / RH (tú, hoy) | El dashboard ejecutivo actual (`/dashboard`) |
| `employee` | Personal que responde encuestas | Un nuevo espacio personal (`/mi-espacio`), nunca el dashboard ejecutivo |

### 2.2 Alta de usuarios (la administradora crea las cuentas, no hay autorregistro)

Esto es un cambio de flujo importante: hoy cualquiera con correo/contraseña puede intentar entrar por `/login`. En este modelo, **solo el admin puede crear cuentas nuevas** — un empleado nunca se registra por su cuenta.

**Flujo:**
1. Desde una nueva sección **"Gestión de Usuarios"** (visible solo para `admin`), la administradora llena: nombre, correo, departamento, equipo (opcional), y horario laboral (ver sección 4).
2. Una Cloud Function (`create_employee_account`, invocable solo por un `admin` autenticado) usa el **Firebase Admin SDK** para:
   - Crear el usuario en Firebase Authentication con una contraseña temporal generada aleatoriamente.
   - Escribir su perfil en Firestore (`users/{uid}`) con `role: "employee"`.
   - Asignarle un **custom claim** `role: "employee"` (esto es lo que usan las reglas de Firestore y el router para diferenciar experiencias, sin depender solo de una lectura a Firestore).
3. La función regresa la contraseña temporal **a la administradora** (se muestra una sola vez en pantalla, con botón de copiar) para que ella se la comparta al empleado por el canal que prefiera. *(Ver sección 9 — sugerencia de automatizar esto por correo más adelante.)*
4. En el primer login, el empleado es forzado a cambiar su contraseña (Firebase Auth ya trae este flujo con `updatePassword` + una bandera `mustChangePassword: true` en su perfil).

### 2.3 Modelo de datos — `users/{uid}`

```
users/{uid}
  displayName: "Ana Torres"
  email: "ana.torres@empresa.example"
  role: "admin" | "employee"
  departmentId: "desarrollo-software"
  teamId: "team_xyz123" | null
  workSchedule: {
    days: ["mon","tue","wed","thu","fri"],
    startTime: "09:00",
    endTime: "18:00",
    timezone: "America/Hermosillo"
  }
  mustChangePassword: true
  createdBy: "<uid del admin>"
  createdAt: Timestamp
  active: true
```

### 2.4 Redirección post-login

Modifica `ProtectedRoute` (o crea un nuevo `RoleBasedRedirect` que envuelva la ruta raíz tras login) para que:
- Lea el custom claim `role` del token del usuario autenticado (`getIdTokenResult()`).
- Si `role === "admin"` → redirige a `/dashboard`.
- Si `role === "employee"` → redirige a `/mi-espacio`.
- Si el perfil tiene `mustChangePassword: true` → antes de cualquier otra cosa, fuerza la pantalla de cambio de contraseña.

---

## 3. El espacio del empleado (`/mi-espacio`)

Nueva sección con su propio layout (más simple que el Sidebar ejecutivo — nada de KPIs organizacionales, el empleado no debe ver datos agregados de otros).

**Contenido:**
- **Encuestas pendientes**: lista de las encuestas activas dirigidas a su departamento que no ha respondido en el ciclo actual (ver sección 7).
- **Mi equipo**: nombre del equipo, compañeros (solo nombres, sin datos sensibles), y botón para unirse a un equipo distinto por código si aún no tiene uno asignado.
- **Kanban de mi equipo**: el tablero colaborativo (ver sección 5).
- **Mi actividad**: un resumen simple y no invasivo de su propio registro de presencia (ver sección 4) — transparencia hacia el empleado de lo que el sistema está registrando sobre él.

---

## 4. Equipos de trabajo

### 4.1 Modelo de datos — `teams/{teamId}`

```
teams/{teamId}
  name: "Squad Backend Alpha"
  departmentId: "desarrollo-software"
  joinCode: "ALPHA-7F2K"        // código corto, único, para autounión
  createdBy: "<uid del admin>"
  memberIds: ["uid1", "uid2", ...]
  createdAt: Timestamp
```

### 4.2 Dos formas de asignar equipo

1. **Asignación directa por el admin**: al crear o editar un perfil de empleado, selecciona un equipo existente de un dropdown.
2. **Autounión por código**: el empleado, desde `/mi-espacio`, escribe un código (`joinCode`) que el admin le compartió, y el sistema lo agrega a `memberIds` de ese equipo y actualiza su `teamId`.

### 4.3 Vista de equipos para el admin

Recuerda que en el Sidebar del dashboard ejecutivo ya existe el ítem **"Team Directory"**, marcado como "Próx." desde el Día 5 — este es el momento de construirlo: lista de equipos, sus miembros, su departamento, y accesos directos a ver el kanban de cada uno.

---

## 5. Kanban por equipo

### 5.1 Modelo de datos — subcolección `teams/{teamId}/tasks/{taskId}`

```
teams/{teamId}/tasks/{taskId}
  title: "Reducir juntas consecutivas los martes"
  description: "..."
  status: "todo" | "in_progress" | "done"
  origin: "ai_recommendation" | "manual"
  sourceMetric: "attritionRisk" | null   // si vino de una recomendación de Gemini
  createdBy: "<uid>"
  assignedTo: "<uid>" | null
  createdAt: Timestamp
  updatedAt: Timestamp
```

### 5.2 Dos orígenes de tareas

1. **Manuales**: cualquier miembro del equipo (o el admin) crea una tarjeta directamente.
2. **Generadas por IA**: en el panel "Gemini AI Strategist" del dashboard ejecutivo (Día 7), cada una de las 3 recomendaciones obtiene un botón **"Convertir en tarea"** que le pide al admin elegir a qué equipo va dirigida, y crea automáticamente la tarjeta en `todo` con `origin: "ai_recommendation"`. Esto cierra el ciclo completo: *dato → análisis de IA → acción de equipo*, que es exactamente la idea que tenías desde el inicio.

### 5.3 Interfaz

Tres columnas (`Por Hacer`, `En Progreso`, `Hecho`), drag-and-drop reutilizando `@dnd-kit` (ya lo tienes instalado desde el form builder). Visible tanto en `/mi-espacio` (para el equipo del empleado) como en la vista de "Team Directory" del admin (para cualquier equipo, con permisos de solo lectura o edición según definas).

---

## 6. Medidor de ausentismo (presencia digital)

Esta es la pieza más delicada de definir bien, así que quiero ser explícita sobre el alcance real antes de que la construyamos.

### 6.1 Qué es y qué NO es

Lo que estás describiendo (verificar login + "movimientos" contra un horario) es, en términos honestos, un **indicador de presencia digital dentro de esta aplicación** — no un sistema de control de asistencia real (no reemplaza checador, no verifica presencia física, no tiene validez legal/laboral). **Esto debe quedar explícito en tu memoria** para no sobre-prometer: es una señal más dentro del diagnóstico de salud organizacional, no un registro oficial de RH.

### 6.2 Definición operativa de "movimiento"

Propongo que un "movimiento" sea cualquiera de estos eventos, capturados automáticamente por el frontend:
- Inicio de sesión.
- Envío de una respuesta de encuesta.
- Interacción con una tarjeta del kanban (crear, mover, comentar).
- Navegación entre secciones dentro de `/mi-espacio` (throttled a máximo 1 registro cada 5 minutos, para no inflar la colección con ruido).

### 6.3 Modelo de datos — `activityLogs/{logId}`

```
activityLogs/{logId}
  userId: "<uid>"
  type: "login" | "survey_submit" | "kanban_action" | "navigation"
  timestamp: Timestamp
```

### 6.4 Cálculo de ausentismo

Una Cloud Function programada (**Cloud Scheduler + función `compute_daily_presence`**, corriendo una vez al final de cada día laboral) recorre, para cada empleado activo:
1. Su `workSchedule` (días y horario).
2. Si hoy es uno de sus días laborales.
3. Si existe **al menos un** `activityLogs` con `timestamp` dentro de su ventana horaria de hoy.
4. Escribe un resumen diario en `presenceSummary/{userId}_{date}` con `present: true/false`.

El dashboard ejecutivo consume esto agregado por departamento/equipo (nueva tarjeta KPI: **"Ausentismo Digital (30 días)"**, con la misma lógica de `useOrgHealthMetrics` que ya tienes, sumando días ausentes / días laborales esperados).

### 6.5 Transparencia hacia el empleado

Como mencioné en la sección 3, el empleado debe poder ver su propio resumen de presencia en `/mi-espacio` — esto es tanto una buena práctica ética (nadie debe ser monitoreado sin saberlo) como argumento defendible ante tu sínodo si preguntan sobre privacidad de datos.

---

## 7. Encuestas múltiples y seleccionables por departamento

### 7.1 Cambios al modelo `surveyTemplates`

```
surveyTemplates/{templateId}
  title: "Q4 Wellness Check-in"
  status: "draft" | "published" | "archived"
  targetDepartments: ["desarrollo-software", "operaciones"]  // vacío = todos los departamentos
  cycle: "weekly" | "biweekly" | "once"
  createdAt / updatedAt: Timestamp
  questions: [ ...igual que hoy... ]
```

Este cambio es compatible con lo que ya construiste: si `targetDepartments` está vacío, se comporta exactamente como ahora (la única plantilla publicada la ve todo mundo).

### 7.2 En el Form Builder (admin)

Agrega un selector multi-choice de departamentos al momento de publicar ("¿A quién va dirigida esta encuesta?"), y cambia la vista de lista de plantillas para mostrar varias **activas al mismo tiempo**, no solo la más reciente.

### 7.3 En `/mi-espacio` (empleado)

En lugar de cargar automáticamente "la" encuesta publicada, el empleado ve una **lista de encuestas pendientes** dirigidas a su departamento (o globales) que aún no respondió en el ciclo actual (usa un registro simple `surveyCompletions/{userId}_{templateId}_{cycleId}` para no repetir). Selecciona cuál responder desde ahí.

---

## 8. Mejoras al dashboard ejecutivo

### 8.1 Filtro por departamento

- Agrega un selector de departamento en el `TopBar` (junto al de "Últimos 30 días").
- Pasa `departmentId` (o `null` para "todos") como parámetro opcional a `useOrgHealthMetrics`, `useDepartmentRisk`, `useWeeklySentiment` y `useWeeklyTrends` — cada hook filtra su query de Firestore por `departmentId` cuando no es `null`.
- El heatmap, al filtrar un solo departamento, puede cambiar su vista de "tabla comparativa" a una "ficha de detalle" de ese departamento (con más contexto: lista de miembros del equipo, su kanban, etc. — conectando con la sección 5).

### 8.2 Exportar a PDF

- Librería sugerida: `jspdf` + `jspdf-autotable` (ligera, sin depender de un backend).
- Botón **"Exportar reporte"** en el dashboard que genera un PDF con: encabezado (logo/nombre de empresa, rango de fechas), tabla de los 4 KPIs, tabla del heatmap de riesgo, y el texto del último análisis de Gemini generado.
- Alternativa más simple si el tiempo aprieta: una vista `/dashboard/print` con estilos de impresión (`@media print`) y usar el diálogo nativo "Imprimir → Guardar como PDF" del navegador — cero librerías nuevas, menos pulido.

### 8.3 Exportar a Excel/CSV

- Librería sugerida: `xlsx` (SheetJS), ya que permite generar un `.xlsx` con **varias hojas** en un solo archivo: una hoja de respuestas crudas (anonimizadas), una de resumen de KPIs, y una de riesgo por departamento — más útil para un analista de RH que un CSV plano.
- Si prefieres algo más ligero, un CSV simple de las respuestas es un `Blob` + `URL.createObjectURL`, sin ninguna librería.

---

## 9. Sugerencias adicionales (no solicitadas, pero coherentes con todo lo anterior)

2. **Notificaciones dentro de la app** (no correo): un ícono de campana en `/mi-espacio` que avise "Tienes una encuesta nueva" o "Se agregó una tarea a tu kanban" — usando un simple listener de Firestore en tiempo real (`onSnapshot`), sin infraestructura adicional.
tambien al admin le deben llegar notificaciones de que esta en riesgo cierto departamento.
3. **Rachas de participación** ("streak"): mostrar a cada empleado cuántas semanas seguidas ha respondido su pulso — mecanismo de gamificación ligero que sube la tasa de respuesta sin ser invasivo.
4. **Vista de "salud del equipo" para líderes de equipo** (un tercer rol intermedio, `team_lead`, opcional): un miembro designado ve el kanban y las métricas agregadas *solo* de su propio equipo, sin llegar al nivel de todo el dashboard ejecutivo — útil si más adelante quieres demostrar granularidad de permisos.
5. **Modo oscuro**: dado que ya tienes un sistema de diseño (`DESIGN.md`) con tokens bien definidos, un modo oscuro es relativamente barato de agregar (duplicar los valores de `@theme` bajo una clase `.dark` y un toggle) y se ve muy bien en una demo.

---

## 10. Cambios necesarios en reglas de seguridad (`firestore.rules`)

Alto nivel — el detalle exacto lo escribimos cuando lleguemos a esa parte:
- `users/{uid}`: un usuario puede leer su propio documento; solo `admin` (vía custom claim) puede crear/editar cualquier documento de usuario.
- `teams/{teamId}`: lectura para miembros del equipo y admins; escritura de `memberIds` permitida a un usuario que se autoasigna vía código válido (esto requiere una Cloud Function intermediaria en vez de escritura directa del cliente, para validar el código sin exponer la lista completa de códigos válidos).
- `teams/{teamId}/tasks/{taskId}`: lectura/escritura para miembros del equipo y admins.
- `activityLogs`: solo creación (nunca lectura ni edición desde el cliente) — se procesan exclusivamente vía Cloud Function con permisos de administrador.
- `surveyTemplates`: la lectura pública ahora debe filtrar por `targetDepartments` — esto probablemente se resuelve mejor en el cliente (traer las publicadas y filtrar) que en la regla misma, ya que Firestore Rules no puede hacer "el array contiene el departamento del usuario que consulta" de forma trivial sin duplicar el `departmentId` del usuario en el token.

---

## 11. Cronograma sugerido (sin fecha límite, pero para mantener orden)

| Fase | Contenido |
|---|---|
| **A** | Roles, custom claims, alta de usuarios por el admin, redirección post-login |
| **B** | Equipos (modelo + autounión por código + vista Team Directory) |
| **C** | Kanban por equipo (manual + conexión con recomendaciones de Gemini) |
| **D** | Encuestas múltiples por departamento + `/mi-espacio` |
| **E** | Medidor de ausentismo (Cloud Function programada + KPI nuevo) |
| **F** | Filtro por departamento en el dashboard ejecutivo |
| **G** | Exportación a PDF y Excel |
| **H** | Sugerencias adicionales que decidas incorporar (sección 9) |
(si puedes, agrega todo lo que puedas)
---

## 12. Preguntas abiertas antes de empezar a construir

Antes de arrancar la Fase A, confírmame:

1. **Ausentismo — ¿el alcance de la sección 6 (presencia digital, no asistencia real) te parece correcto?** Si, ya que es para una empresa con trabajo remoto
2. **Contraseñas temporales — ¿prefieres que tú se las compartas manualmente al empleado (más simple, cero configuración extra), o quieres ya el envío automático por correo** sera manual, el admin se la da al empleado.
3. **¿El kanban debe ser visible/editable por todo el equipo por igual, o quieres que solo el admin pueda mover tarjetas y los empleados solo comenten?** todos lo pueden editar y todos pueden crear o unirse a uno nuevo por medio de un codigo
4. **¿Quieres el rol intermedio `team_lead` (sugerencia #4) desde ya, o lo dejamos como posible extensión futura?**
desde ya

