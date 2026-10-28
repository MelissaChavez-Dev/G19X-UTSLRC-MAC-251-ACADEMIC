# Dashboard Ejecutivo y Plataforma de Salud Organizacional

Proyecto de estadía profesional desarrollado por **Melissa Alejandra Chávez**, estudiante de la carrera de TSU en Desarrollo de Software Multiplataforma de la **Universidad Tecnológica de San Luis Río Colorado (UTSLRC)**.

> **Estado del proyecto:** finalizado desde el **19 de octubre**; no se realizarán más cambios. Las credenciales de acceso y de la API ya se entregaron en la plataforma **TODO academy**, en la sección **«Mis documentos»**.

**Aplicación desplegada:** [welfare-supra.netlify.app](https://welfare-supra.netlify.app/login)

---

## 1. Descripción del Proyecto

Aplicación web que integra indicadores de salud organizacional (bienestar laboral, eNPS, actividad digital registrada, rotación y ejecución de tareas Kanban) con factores psicosociales inspirados en las dimensiones de la norma ISO 45003. El sistema no evalúa el cumplimiento de dicha norma. La actividad digital y la ejecución de tareas Kanban son indicadores indirectos: no miden la asistencia física ni el desempeño individual.

La aplicación ofrece dos experiencias:
- **Experiencia ejecutiva (Dirección y Recursos Humanos):** tableros interactivos con KPIs en tiempo real, medidor semicircular de eNPS con expresiones faciales, matriz de riesgos por departamento, tendencias históricas, exportación a PDF y Excel, y un panel de asesoría estratégica basado en Google Gemini que convierte diagnósticos cualitativos en tareas de equipo.
- **Experiencia colaborativa (personal):** portal para colaboradores (`/mi-espacio`), encuestas segmentadas, seguimiento de tareas de bienestar en tableros Kanban (`/mis-proyectos`) y un resumen transparente de presencia digital para esquemas de trabajo remoto e híbrido.

---

## 2. Herramientas y recursos

- **IA durante el desarrollo:** GitHub Copilot y la asistencia conversacional de programación en VS Code apoyaron la exploración, refactorización y depuración del código, la preparación y revisión de pruebas, y la redacción de documentación y mensajes de commit. La autora es responsable de revisar las propuestas, comprender las fórmulas y mantener el código. La integración de Gemini que forma parte del producto es independiente de las herramientas de IA usadas durante el desarrollo.
- **Figma y Stitch:** diseño y exploración de interfaces.
- **Firebase y Google Cloud:** autenticación, base de datos y servicios en la nube.
- **Google AI Studio y Gemini:** experimentación e integración de la API de Gemini para generar explicaciones y recomendaciones.
- **Freepik:** búsqueda y selección de recursos gráficos.
- **Microsoft Power BI:** consulta de datos de referencia para definir los KPI del dashboard. [Reporte de Power BI](https://app.powerbi.com/view?r=eyJrIjoiMGEyYzkyNjUtZjg0Yy00YmI5LThiYjktYmY4YjJiNTRjMGIzIiwidCI6IjFiMWY3NzkzLWU3NjUtNDhjYy04NmZmLTYzNGUwN2Q1NjhlNCJ9).
- **Referencias sobre salud organizacional:** [Salud organizacional: qué es y cómo mejorarla (QuestionPro)](https://www.questionpro.com/blog/es/salud-organizacional/) e [ISO 45003: seguridad y salud psicológicas en el trabajo (DNV)](https://www.dnv.com.mx/services/iso-45003-seguridad-y-salud-psicologicas-en-el-trabajo-204058/).

---

## 3. Requisitos previos

- **Node.js:** versión 18.0 o posterior (se recomienda la 20 o la 24).
- **npm:** administrador de paquetes incluido con Node.js.
- **Firebase:** proyecto activo con Firebase Authentication y Cloud Firestore. La configuración del SDK web se define en `.env.local`.
- **Solo para desplegar el backend en un proyecto Firebase propio** (consulta «Despliegue del backend» en la sección 5): Firebase CLI, Python en la versión indicada en `firebase.json`, un proyecto con el plan Blaze y una clave de la API de Gemini. Si se utiliza el proyecto Firebase entregado para la evaluación, este paso no es necesario: el backend ya está desplegado.

---

## 4. Instalación

1. **Clona o descarga el repositorio:**
   ```bash
   git clone https://github.com/MelissaChavez-Dev/G19X-UTSLRC-MAC-251-ACADEMIC.git
   cd G19X-UTSLRC-MAC-251-ACADEMIC
   ```

2. **Instala las dependencias:**
   ```bash
   npm install
   ```

3. **Configura las variables de entorno:**
   Copia `.env.example` en un archivo llamado `.env.local`, en la raíz del proyecto, y sustituye cada valor por la configuración de la aplicación web de tu proyecto Firebase (Firebase Console → Configuración del proyecto → Tus apps). El repositorio no incluye claves ni credenciales de prueba; utiliza los valores de tu propio proyecto.
   ```bash
   cp .env.example .env.local
   ```

---

## 5. Ejecución del proyecto

### Modo de desarrollo
Inicia el servidor local de Vite con:
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:5173`.

### Compilación y vista previa de producción
Para compilar el proyecto y previsualizar la versión de producción:
```bash
npm run build
npm run preview
```

### Despliegue del backend (Firebase)

El frontend utiliza Cloud Functions y las reglas de Firestore y Storage. Las variables de `.env.example` configuran el SDK web, pero no crean ni despliegan la base de datos.

Para desplegar el backend en un proyecto propio necesitas Firebase CLI, Python 3.14 (la versión indicada en `firebase.json`), un proyecto con el plan y los servicios requeridos, y el secreto `GEMINI_API_KEY` configurado en Firebase. Selecciona el proyecto con `firebase use --add`; este comando crea un archivo `.firebaserc` local que Git ignora. Después, ejecuta `firebase deploy`. No guardes credenciales de servicio en el repositorio.

---

## 6. Datos de encuestas y privacidad

Para responder encuestas se requiere una cuenta activa. La función `submit_survey_response` valida la plantilla, el periodo, el departamento y las respuestas. Después, dentro de una transacción, registra la respuesta y garantiza que cada colaborador responda una sola vez por ciclo. El documento analítico no incluye el UID; el registro de finalización sí lo contiene, pero solo su propietario puede leerlo. Las reglas impiden que los colaboradores lean las respuestas y bloquean toda escritura directa desde el navegador. El personal administrador consulta respuestas desidentificadas para el análisis.

La aplicación no genera respuestas automáticamente. La Cloud Function asigna `source: "live"` a las respuestas recibidas por el flujo habitual, y `responseService.js` limita las consultas analíticas a los registros con `source == "live"`. Este campo identifica el canal de captura, pero no demuestra por sí solo que el perfil corresponda a una persona real. Firestore conserva registros históricos sintéticos: no se eliminan automáticamente y, al carecer de `source: "live"`, quedan fuera de esas consultas.

### Procedencia de la demostración

Los perfiles de prueba son ficticios. **Cinco personas que apoyaron las pruebas** enviaron manualmente, desde el despliegue de Netlify, las respuestas que aparecen en las capturas. Para ello usaron esas cuentas ficticias y siguieron los comportamientos definidos para cada ID. La matriz de IDs y escenarios está en el documento de apoyo `MANUAL DE USUARIO PARA PRUEBAS DE ENCUESTAS Y VISUALIZACIÓN DE DATOS EN WELFARE.docx`, entregado por separado. Los IDs y las credenciales no se publican aquí.

Las capturas actuales muestran 25 perfiles (cinco por departamento), 25 respuestas, una participación del 100 % y una calidad de datos de 100/100. Son resultados de un escenario de demostración controlado: no representan una muestra de 25 empleados ni permiten inferir resultados de una población. La etiqueta `source: "live"` tampoco certifica que las personas asociadas a los perfiles sean empleados reales.

---

## 7. Primer uso, usuarios y acceso

### Preparación inicial

1. Configura Firebase Authentication, Firestore y las variables del SDK web de tu proyecto, como se indica en las secciones anteriores.
2. El responsable del proyecto crea en Firebase Authentication la cuenta inicial autorizada (correo y contraseña) y comparte sus datos por un canal privado. No incluyas contraseñas, claves de servicio ni valores reales en el repositorio.
3. Inicia sesión con esa cuenta. Si una cuenta autenticada aún no tiene rol, la aplicación invoca `bootstrap_admin`, que asigna el primer rol `admin` solo cuando todavía no existe un perfil administrador en Firestore. Este proceso se puede usar una única vez; si ya existe un administrador, los accesos nuevos deben habilitarse desde **Gestión de Usuarios**.
4. Desde la cuenta de administrador, abre **Gestión de Usuarios** (`/admin/usuarios`) y crea primero los departamentos. Se guardan en `departments` con un identificador derivado de su nombre y quedan disponibles para registrar personas y configurar encuestas. También puedes renombrarlos o desactivarlos sin perder su historial.
5. Crea las cuentas de los colaboradores desde **Gestión de Usuarios**, asígnales un departamento y comparte la contraseña temporal de forma privada. Cada usuario deberá cambiarla al iniciar sesión.

### Archivos de credenciales

Las credenciales no forman parte del repositorio y no deben publicarse en él. Se manejan en dos archivos distintos, entregados en **TODO academy**, sección **«Mis documentos»**:

- **`KEYS.txt`:** configuración y claves de Firebase y de la API, referenciadas en `.env.example`.
- **`CREDENCIALES DE ACCESO.md`:** cuentas para iniciar sesión en el despliegue de evaluación. No contiene las claves de configuración de `KEYS.txt`.

### Roles y acceso

El sistema utiliza los roles `admin` y `employee` y no permite el autorregistro. La primera cuenta se configura como se explicó antes; las siguientes se crean mediante Firebase Authentication y **Gestión de Usuarios**.

Las cuentas `employee` responden encuestas del departamento asignado a su perfil. El personal administrador puede responder por un departamento seleccionado y consultar la calidad de los datos, la actividad digital, los permisos, los equipos y los reportes.

---

## 8. Estructura del repositorio

```text
├── Arquitectura/              # Diagramas y documentación de arquitectura
├── docs/                      # PRD y especificación del MVP
├── Evidencias/                # Reporte QA y 29 capturas PNG de la interfaz
├── Fichas_KPIs_Dashboard_Salud_Organizacional.md # Definiciones y fichas de KPIs
├── functions/
│   ├── main.py                # Reexporta los endpoints para Firebase y compatibilidad de imports
│   ├── accounts.py            # Bootstrap y administración de cuentas
│   ├── surveys.py             # Validación y envío de encuestas
│   ├── permissions.py         # Solicitudes de permisos y adjuntos
│   ├── teams.py               # Equipos y tareas Kanban
│   ├── presence.py            # Cálculo de presencia digital
│   ├── common.py              # Utilidades compartidas del backend
│   ├── ai_functions.py        # Funciones de Gemini, límites de entrada y validación de acceso
│   └── shared.py              # Autenticación y acceso compartido a Firestore
├── public/                    # Archivos estáticos y logos
├── src/
│   ├── assets/                # Ilustraciones y recursos gráficos
│   ├── components/            # Componentes de interfaz (medidor eNPS, AI Strategist, Heatmap, TopBar, Kanban, etc.)
│   ├── data/                  # Preguntas base, plantillas y temas
│   ├── hooks/                 # Hooks personalizados de React (useOrgHealthMetrics, useAuth, useTheme, etc.)
│   ├── pages/                 # Páginas (Dashboard, Login, MiEspacio, SurveyBuilder, SurveyRunner, TeamBoard, etc.)
│   ├── services/              # Servicios de conexión a Firebase, Gemini IA y exportaciones
│   └── utils/                 # Utilidades de fechas, métricas y estilos de riesgo
├── tests/                     # Pruebas JavaScript, Python y reglas de Firestore
├── .env.example               # Plantilla de variables de entorno web
├── firestore.rules            # Reglas de seguridad de Firestore
├── storage.rules              # Reglas de seguridad de Storage
├── package.json               # Dependencias y scripts del proyecto
└── README.md                  # Este documento
```

---

## 9. Pruebas y evidencias

Ejecuta las pruebas del frontend con:
```bash
npm test
```

La prueba de Cloud Functions necesita las dependencias Python de `functions/requirements.txt`; no requiere credenciales de Firebase:
```bash
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
python -m pip install -r functions/requirements.txt
python -m unittest discover -s tests -p "test_*.py"
```

Las reglas de Firestore se prueban con el emulador (requiere Firebase CLI y Java):
```bash
npm run test:rules
```

El reporte de QA con los resultados de las validaciones automatizadas está en `Evidencias/REPORTE_QA.md`. La carpeta `Evidencias/` también contiene 29 capturas PNG de los flujos de la interfaz. Estas muestran el estado de la aplicación durante la demostración y no sustituyen las pruebas automatizadas ni una medición de la población real.

La guía de primer uso y operación está en [`docs/MANUAL_DE_USUARIO.md`](docs/MANUAL_DE_USUARIO.md). En `docs/` también se encuentran el plan de trabajo y el plan de mantenimiento y soporte.

---

## 10. Stack tecnológico

- **Frontend:** React 19, Vite 8, Tailwind CSS v4, Framer Motion.
- **Gráficos e interactividad:** Recharts, `@dnd-kit/core`, `@dnd-kit/sortable` y medidores SVG personalizados.
- **Base de datos y autenticación:** Firebase Authentication y Cloud Firestore.
- **Inteligencia artificial:** API de Google Gemini (`gemini-3.8-flash`).
- **Exportación de archivos:** `jspdf`, `jspdf-autotable` y `xlsx` (SheetJS).

La especificación de requisitos está en [`docs/PRD_Dashboard_Salud_Organizacional.md`](docs/PRD_Dashboard_Salud_Organizacional.md). La documentación de soporte, mantenimiento y planificación está disponible en:
- [`docs/PLAN_MANTENIMIENTO_Y_SOPORTE.md`](docs/PLAN_MANTENIMIENTO_Y_SOPORTE.md)
- [`docs/PLAN_DE_TRABAJO.md`](docs/PLAN_DE_TRABAJO.md)
- [`docs/REGISTRO_RIESGOS_DEPENDENCIAS.md`](docs/REGISTRO_RIESGOS_DEPENDENCIAS.md)

Como parte de la defensa, la autora deberá explicar las métricas, los filtros de origen y las limitaciones de los datos, además de realizar un cambio pequeño sin asistencia generativa, conforme a los criterios de evaluación.

---

## 11. Notas académicas

Este repositorio forma parte de la documentación técnica y de los entregables de la **Memoria de Estadía Profesional**, elaborada para obtener el título de TSU en Desarrollo de Software Multiplataforma, conforme al Manual Metodológico de la **UTSLRC**.