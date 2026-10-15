# Dashboard Ejecutivo y Plataforma de Salud Organizacional

Proyecto de estadía profesional desarrollado por **Melissa Alejandra Chávez** para la carrera de TSU en Desarrollo de Software Multiplataforma en la **Universidad Tecnológica de San Luis Río Colorado (UTSLRC)**.

---

## 1. Descripción del Proyecto

Aplicación web integral que consolida indicadores de salud organizacional (bienestar laboral, eNPS, actividad digital registrada, rotación y ejecución de tareas Kanban) y factores psicosociales inspirados en dimensiones descritas por ISO 45003. No es una evaluación de conformidad con la norma; actividad digital y ejecución Kanban son indicadores proxy, no mediciones de asistencia física ni de desempeño individual.

Cuenta con una **doble experiencia**:
- **Experiencia Ejecutiva (Dirección / RH):** Tableros interactivos con KPIs en tiempo real, medidor de eNPS tipo termómetro semicircular con caras expresivas, matriz de riesgo departamental, tendencias históricas, exportación formal a PDF/Excel y un panel de asesoría estratégica impulsado por Inteligencia Artificial (Google Gemini) que convierte diagnósticos cualitativos en tareas de equipo.
- **Experiencia Colaborativa (Empleados):** Portal de colaboradores (`/mi-espacio`), contestación ágil de encuestas segmentadas, seguimiento de tareas de bienestar en tableros Kanban (`/mis-proyectos`) y resumen transparente de presencia digital para esquemas de trabajo remoto e híbrido.

---

## 2. Requisitos Previos

- **Node.js:** Versión 18.0 o superior (recomendada v20 o v24).
- **npm:** Gestor de paquetes incluido con Node.js.
- **Firebase:** Proyecto activo con Firebase Authentication y Cloud Firestore configurados (se refiere a las API en .env.local, estas mismas las puede encontrar en KEYS.txt, este archivo al igual que .firebaserc, se eliminarán de .gitignore al momento de entregar el proyecto para evaluación)
- **Solo si se despliega el backend en un proyecto Firebase propio** (ver sección 4, "Despliegue del backend"): Firebase CLI, Python (la versión del runtime declarado en `firebase.json`), plan Blaze del proyecto y una clave de la API de Gemini. Si se evalúa contra el proyecto Firebase entregado, el backend ya está desplegado y este paso no es necesario.

---

## 3. Instalación

1. **Clonar o descargar el repositorio:**
   ```bash
   git clone https://github.com/MelissaChavez-Dev/G19X-UTSLRC-MAC-251-ACADEMIC.git
   cd G19X-UTSLRC-MAC-251-ACADEMIC
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Copia la plantilla `.env.example` como `.env.local` en la raíz del proyecto y reemplaza cada valor con la configuración de la aplicación web de tu proyecto Firebase (Firebase Console → Configuración del proyecto → Tus apps). Las claves con datos de prueba están en KEYS.txt.
   ```bash
   cp .env.example .env.local
   ```
   Variables requeridas (las seis son obligatorias):
   ```env
   VITE_FIREBASE_API_KEY=tu_api_key
   VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=tu-proyecto
   VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
   VITE_FIREBASE_APP_ID=tu_app_id
   ```

---

## 4. Ejecución del Proyecto

### Modo Desarrollo
Para iniciar el servidor de desarrollo local con Vite:
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:5173`.

### Compilación y Vista Previa para Producción
Para validar y compilar el proyecto:
```bash
npm run build
npm run preview
```

### Despliegue del backend (Firebase)

El frontend lee y escribe a través de Cloud Functions, reglas de Firestore y Storage. Las encuestas **solo** pueden enviarse mediante la función `submit_survey_response` (las reglas bloquean la escritura directa en `responses`), por lo que el backend debe estar desplegado antes de usar la aplicación. Esta sección aplica cuando se usa un proyecto Firebase propio; el proyecto entregado ya está desplegado.

1. **Instalar la CLI de Firebase e iniciar sesión:**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Seleccionar el proyecto.** El archivo `.firebaserc` apunta al proyecto por defecto; para usar otro:
   ```bash
   firebase use <id-del-proyecto>
   ```

3. **Habilitar los servicios en Firebase Console:** Authentication (proveedor *Correo electrónico/contraseña*), Cloud Firestore y Storage. El proyecto debe tener el plan **Blaze**: lo requieren Cloud Functions y la función programada `compute_daily_presence` (Cloud Scheduler, diaria a las 23:30, zona America/Hermosillo).

4. **Guardar la clave de Gemini como secreto de Cloud Functions** (no va en el código ni en `.env.local`):
   ```bash
   firebase functions:secrets:set GEMINI_API_KEY
   ```

5. **Desplegar funciones, reglas, índices y Storage** desde la raíz del repositorio:
   ```bash
   firebase deploy --only functions,firestore:rules,firestore:indexes,storage
   ```
   Los índices de Firestore tardan unos minutos en construirse; hasta que terminen, las consultas del dashboard que los usan devolverán error.

6. **Primer administrador.** En un proyecto sin administradores, crea una cuenta en Firebase Authentication e inicia sesión con ella: la función `bootstrap_admin` le asigna el rol `admin` automáticamente a la primera cuenta. A partir de ahí, las demás cuentas, los departamentos y los equipos se gestionan desde la aplicación (`/admin/usuarios` y `/equipos`).

### Pruebas unitarias
Las reglas de fechas, saldo de vacaciones y clasificación de asistencia usan Node.js nativo:
```bash
npm test
```

## 5. Datos de encuestas y privacidad

Las rutas para responder encuestas requieren una cuenta activa. `submit_survey_response` valida plantilla, periodo, departamento y respuestas, y en una transacción registra la respuesta y el control de unicidad por colaborador y ciclo. El documento analítico no contiene el UID; el control de completado, que sí contiene el UID, solo puede leerlo su propietario. Las reglas bloquean la lectura de respuestas para colaboradores y toda escritura directa desde el navegador; la administración consulta las respuestas desidentificadas para analítica.

No se generan respuestas sintéticas ni se incluyen filtros de origen en la aplicación. Las respuestas nuevas solo se etiquetan como versión actual cuando contienen los seis factores directos; los registros anteriores se excluyen de las métricas psicosociales. Los registros históricos sintéticos también se excluyen de las consultas analíticas y no se eliminan automáticamente de Firestore.

---

## 6. Usuarios y Acceso al Sistema

El sistema utiliza los roles `admin` y `employee`; no hay autorregistro abierto. Las cuentas y contraseñas se aprovisionan individualmente desde Firebase Authentication y Gestión de Usuarios. `team_lead` tiene acceso a las vistas de su equipo (`/mi-equipo`, `/mis-proyectos` y `/equipos/:teamId`).

Las cuentas `employee` responden encuestas para el departamento asignado a su perfil; la administración puede responder para un departamento seleccionado. La administración también puede revisar calidad de datos, actividad digital, permisos, equipos y reportes.


### Credenciales de Acceso

#### A. Cuenta de Administrador (Dirección / RH)
- **Correo electrónico:** `admin@welfare.com`
- **Contraseña de prueba actual:** `12345678`
- **Pantalla a la que entra automáticamente:** `/dashboard` (Dashboard Ejecutivo principal).
- **Funcionalidades exclusivas:**
  - Visualización y filtrado del Dashboard Ejecutivo.
  - Revisión de la calidad de datos (`/admin/calidad`).
  - Asistencia digital (`/admin/asistencia`) y revisión de permisos (`/admin/permisos`).
  - Exportación de reportes formales en **PDF** y **Excel** multipestaña.
  - Generación de diagnósticos con IA (Gemini) y conversión a tareas.
  - **Gestión de Usuarios** (`/admin/usuarios`): Alta de colaboradores, identificador, puesto, tipo de contratación, fecha de ingreso, gráfica por departamento, horarios y reseteo de contraseñas.
  - **Directorio de Equipos** (`/equipos`): Creación de equipos y visualización de códigos de unión (`joinCode`).
  - **Constructor de Encuestas** (`/survey-builder`): Creación visual y publicación de encuestas segmentadas por departamento con `@dnd-kit`.

#### B. Cuenta de Empleado (Pruebas)
- Inicia sesión con el correo de una cuenta personal de empleado que ya esté registrada en Firebase Authentication.
  puede ser: 
 **Correo** `beatrizlozano@operaciones.com`
- **Contraseña de prueba actual:** `12345678`
- **Pantalla a la que entran automáticamente:** `/mi-espacio` (Espacio del Colaborador).
- **Funcionalidades del empleado:**
  - Ver y responder encuestas pendientes asignadas a su área (`/encuesta/:templateId`).
  - Unirse a un equipo de trabajo mediante código con `JoinTeamCard`.
  - Tablero Kanban colaborativo de su equipo (`/mis-proyectos`).
  - Solicitud y seguimiento de vacaciones, incapacidades y otros permisos; edición de nombre y teléfono y carga de foto de perfil desde `/mi-espacio`.
  - Su foto de perfil aparece en los comentarios del Kanban.
  - Resumen de presencia y actividad digital personal.

> **Nota de seguridad:** `12345678` es una contraseña compartida únicamente para el entorno de pruebas y evaluación del proyecto. 

--- 

## 7. Estructura del Repositorio

```text
├── docs/                      # Documentación oficial (PRD v3.0 y MVP unificado)
├── functions/                 # Backend en Cloud Functions (Python) para roles, usuarios y tareas
├── public/                    # Archivos estáticos y logos
├── src/
│   ├── assets/                # Ilustraciones y recursos gráficos
│   ├── components/            # Componentes de interfaz (medidor eNPS, AI Strategist, Heatmap, TopBar, Kanban, etc.)
│   ├── data/                  # Preguntas base, plantillas y temas
│   ├── hooks/                 # Hooks personalizados de React (useOrgHealthMetrics, useAuth, useTheme, etc.)
│   ├── pages/                 # Páginas (Dashboard, Login, MiEspacio, SurveyBuilder, SurveyRunner, TeamBoard, etc.)
│   ├── services/              # Servicios de conexión a Firebase, Gemini IA y exportaciones
│   └── utils/                 # Utilidades de fechas, métricas y estilos de riesgo
├── firestore.rules            # Reglas de seguridad de Firestore
├── package.json               # Dependencias y scripts del proyecto
└── README.md                  # Este documento
```

---

## 8. Stack Tecnológico

- **Frontend:** React 19, Vite 8, Tailwind CSS v4, Framer Motion.
- **Gráficos e Interactividad:** Recharts, `@dnd-kit/core`, `@dnd-kit/sortable`, Medidores SVG reactivos a la medida.
- **Base de Datos y Autenticación:** Firebase Authentication y Cloud Firestore.
- **Inteligencia Artificial:** Google Gemini API (`gemini-3.8-flash`).
- **Exportaciones:** `jspdf`, `jspdf-autotable`, `xlsx` (SheetJS).

---

## 9. Notas Académicas

Este repositorio forma parte de la documentación técnica y entregable de la **Memoria de Estadía Profesional** para la obtención del título de TSU en Desarrollo de Software Multiplataforma, desarrollada conforme al Manual Metodológico de la **UTSLRC**.