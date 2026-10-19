# Dashboard Ejecutivo y Plataforma de Salud Organizacional

Proyecto de estadía profesional desarrollado por **Melissa Alejandra Chávez** para la carrera de TSU en Desarrollo de Software Multiplataforma en la **Universidad Tecnológica de San Luis Río Colorado (UTSLRC)**.

---

## 1. Descripción del Proyecto

Aplicación web integral que consolida indicadores de salud organizacional (bienestar laboral, eNPS, actividad digital registrada, rotación y ejecución de tareas Kanban) y factores psicosociales inspirados en dimensiones descritas por ISO 45003. No es una evaluación de conformidad con la norma; actividad digital y ejecución Kanban son indicadores proxy, no mediciones de asistencia física ni de desempeño individual.

Cuenta con una **doble experiencia**:
- **Experiencia Ejecutiva (Dirección / RH):** Tableros interactivos con KPIs en tiempo real, medidor de eNPS tipo termómetro semicircular con caras expresivas, matriz de riesgo departamental, tendencias históricas, exportación formal a PDF/Excel y un panel de asesoría estratégica impulsado por Inteligencia Artificial (Google Gemini) que convierte diagnósticos cualitativos en tareas de equipo.
- **Experiencia Colaborativa (Empleados):** Portal de colaboradores (`/mi-espacio`), contestación ágil de encuestas segmentadas, seguimiento de tareas de bienestar en tableros Kanban (`/mis-proyectos`) y resumen transparente de presencia digital para esquemas de trabajo remoto e híbrido.

Nota: el proyecto se encuentra totalmente desplegado en: https://welfare-supra.netlify.app/login
permite hacer todas las funciones, solo inicie sesion con las credenciales que se especifican en el documento CREDENCIALES DE ACCESO.md (se entregó por privado al evaluador)

## Herramientas y recursos utilizados

- **Uso de IA durante el desarrollo:** GitHub Copilot y asistencia conversacional de programación en VS Code apoyaron la exploración, refactorización, depuración, preparación/revisión de pruebas y redacción de documentación y mensajes de commit. La autora conserva la responsabilidad de revisar las propuestas, entender las fórmulas y poder mantener el código. La integración de Gemini descrita abajo pertenece al producto en ejecución y es distinta del apoyo de IA usado durante el desarrollo.
- **Figma y Stitch:** diseño y exploración de interfaces.
- **Firebase y Google Cloud:** autenticación, base de datos y servicios en la nube.
- **Google AI Studio y Gemini:** experimentación e integración de la API de Gemini para las explicaciones y recomendaciones de IA del producto.
- **Freepik:** búsqueda y selección de recursos gráficos.
- **Microsoft Power BI:** consulta de datos de referencia para conocer y definir los KPI representados en el dashboard. [Reporte de Power BI](https://app.powerbi.com/view?r=eyJrIjoiMGEyYzkyNjUtZjg0Yy00YmI5LThiYjktYmY4YjJiNTRjMGIzIiwidCI6IjFiMWY3NzkzLWU3NjUtNDhjYy04NmZmLTYzNGUwN2Q1NjhlNCJ9).
- **Referencias de salud organizacional:** [Salud organizacional: qué es y cómo mejorarla (QuestionPro)](https://www.questionpro.com/blog/es/salud-organizacional/) y [ISO 45003: seguridad y salud psicológicas en el trabajo (DNV)](https://www.dnv.com.mx/services/iso-45003-seguridad-y-salud-psicologicas-en-el-trabajo-204058/).

---

## 2. Requisitos Previos

- **Node.js:** Versión 18.0 o superior (recomendada v20 o v24).
- **npm:** Gestor de paquetes incluido con Node.js.
- **Firebase:** Proyecto activo con Firebase Authentication y Cloud Firestore configurados (se refiere a las API en .env.local).
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
   Copia la plantilla `.env.example` como `.env.local` en la raíz del proyecto y reemplaza cada valor con la configuración de la aplicación web de tu proyecto Firebase (Firebase Console → Configuración del proyecto → Tus apps). El repositorio no incluye claves ni credenciales de prueba; usa los valores de tu propio proyecto.
   ```bash
   cp .env.example .env.local
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

El frontend usa Cloud Functions, reglas de Firestore y Storage. Las variables de `.env.example` configuran el SDK web; no crean ni despliegan la base de datos.

Para desplegar el backend en un proyecto propio se requiere Firebase CLI, Python 3.14 (runtime de `firebase.json`), un proyecto con el plan y servicios necesarios y el secreto `GEMINI_API_KEY` configurado en Firebase. Selecciona el proyecto con `firebase use --add` (esto crea un `.firebaserc` local, ignorado por Git) y despliega con `firebase deploy`. Las credenciales de servicio no deben guardarse en el repositorio.


## 5. Datos de encuestas y privacidad

Las rutas para responder encuestas requieren una cuenta activa. `submit_survey_response` valida plantilla, periodo, departamento y respuestas, y en una transacción registra la respuesta y el control de unicidad por colaborador y ciclo. El documento analítico no contiene el UID; el control de completado, que sí contiene el UID, solo puede leerlo su propietario. Las reglas bloquean la lectura de respuestas para colaboradores y toda escritura directa desde el navegador; la administración consulta las respuestas desidentificadas para analítica.

La aplicación no genera respuestas automáticamente. Las respuestas enviadas por el flujo normal reciben `source: "live"` en la Cloud Function y `responseService.js` limita las consultas analíticas a `source == "live"`. Este campo identifica el canal de captura; no prueba por sí solo que el perfil corresponda a una persona real. Hay registros históricos sintéticos en Firestore; no se borran automáticamente y los que no tienen `source: "live"` quedan fuera de estas consultas.

### Procedencia de la demostración

Los perfiles de prueba son ficticios. Las respuestas que aparecen en las capturas fueron capturadas manualmente en el despliegue de Netlify por **cinco personas reales que apoyaron la prueba**, usando esas cuentas ficticias y siguiendo comportamientos definidos para cada ID. La matriz de IDs y escenarios está en el archivo de apoyo `MANUAL DE USUARIO PARA PRUEBAS DE ENCUESTAS Y VISUALIZACIÓN DE DATOS EN WELFARE.docx`, entregado por separado; no se publican aquí los IDs ni las credenciales.

En las capturas actuales aparecen 25 perfiles (cinco por departamento), 25 respuestas, participación de 100 % y calidad de datos de 100/100. Son resultados de ese escenario de demostración controlado, no una muestra representativa de 25 empleados ni evidencia de resultados poblacionales. La etiqueta `source: "live"` tampoco debe interpretarse como certificación de que las personas perfiladas sean empleados reales.

---

## 6. Primer uso, usuarios y acceso

### Preparación inicial

1. Configura Authentication, Firestore y las variables del SDK web de tu proyecto Firebase siguiendo las secciones anteriores.
2. El responsable del proyecto crea en Firebase Authentication la cuenta inicial autorizada (correo y contraseña) y entrega sus datos por un canal privado. No subas contraseñas, claves de servicio ni valores reales al repositorio.
3. Inicia sesión con esa cuenta. Cuando una cuenta autenticada aún no tiene rol, la aplicación invoca `bootstrap_admin`; la función solo asigna el primer rol `admin` si todavía no existe ningún perfil administrador en Firestore. Este bootstrap es de un solo uso. Si ya existe un admin, el nuevo acceso debe ser aprovisionado desde **Gestión de Usuarios**.
4. Ya como admin, abre **Gestión de Usuarios** (`/admin/usuarios`) y crea primero los departamentos desde la sección de departamentos. Se guardan en `departments` con un identificador derivado del nombre; después estarán disponibles al dar de alta personas y configurar encuestas. También puedes renombrar o desactivar departamentos sin borrar su historial.
5. Crea las cuentas de colaboradores desde **Gestión de Usuarios**, asigna el departamento y entrega la contraseña temporal de forma privada; el usuario deberá cambiarla al entrar.

**Archivos privados distintos:** `KEYS.txt` contiene la configuración/claves de Firebase que se entrega por separado y se referencia en `.env.example`; `CREDENCIALES DE ACCESO.md` contiene las cuentas para iniciar sesión y se entrega por privado al evaluador. No son el mismo archivo ni deben publicarse en el repositorio.

### Roles y acceso

El sistema utiliza los roles `admin` y `employee`; no hay autorregistro abierto. La primera cuenta se prepara como se explica arriba; las cuentas siguientes se aprovisionan desde Firebase Authentication y Gestión de Usuarios.

Las cuentas `employee` responden encuestas para el departamento asignado a su perfil; la administración puede responder para un departamento seleccionado. La administración también puede revisar calidad de datos, actividad digital, permisos, equipos y reportes.

Para acceder al despliegue de evaluación, usa las cuentas autenticadas de `CREDENCIALES DE ACCESO.md`, entregado en la carpeta privada del evaluador. Ese archivo no contiene las claves de configuración descritas en `KEYS.txt`.

--- 

## 7. Estructura del Repositorio

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

## 8. Pruebas y evidencias

Las pruebas del frontend se ejecutan con:
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

Las reglas de Firestore se prueban contra el emulador (requiere Firebase CLI y Java):
```bash
npm run test:rules
```

El reporte QA con las validaciones automatizadas está en `Evidencias/REPORTE_QA.md`; `Evidencias/` ya contiene 29 capturas PNG de los flujos de la interfaz. Las capturas ilustran el estado visible durante la demostración y no sustituyen las pruebas automatizadas ni una medición real de la población.

La guía de primer uso y operación está en [`docs/MANUAL_DE_USUARIO.md`](docs/MANUAL_DE_USUARIO.md); el plan de trabajo y el plan de mantenimiento y soporte están en `docs/`.

---

## 9. Stack Tecnológico

- **Frontend:** React 19, Vite 8, Tailwind CSS v4, Framer Motion.
- **Gráficos e Interactividad:** Recharts, `@dnd-kit/core`, `@dnd-kit/sortable`, Medidores SVG reactivos a la medida.
- **Base de Datos y Autenticación:** Firebase Authentication y Cloud Firestore.
- **Inteligencia Artificial:** Google Gemini API (`gemini-3.8-flash`).
- **Exportaciones:** `jspdf`, `jspdf-autotable`, `xlsx` (SheetJS).

La especificación de requisitos está en [`docs/PRD_Dashboard_Salud_Organizacional.md`](docs/PRD_Dashboard_Salud_Organizacional.md). El detalle de soporte, mantenimiento y planificación se documenta en:
- [`docs/PLAN_MANTENIMIENTO_Y_SOPORTE.md`](docs/PLAN_MANTENIMIENTO_Y_SOPORTE.md)
- [`docs/PLAN_DE_TRABAJO.md`](docs/PLAN_DE_TRABAJO.md)
- [`docs/REGISTRO_RIESGOS_DEPENDENCIAS.md`](docs/REGISTRO_RIESGOS_DEPENDENCIAS.md)

Para la defensa, la autora debe poder explicar las métricas, filtros de origen y límites de los datos y realizar un cambio pequeño sin asistencia generativa, conforme a la evaluación indicada.

---

## 10. Notas Académicas

Este repositorio forma parte de la documentación técnica y entregable de la **Memoria de Estadía Profesional** para la obtención del título de TSU en Desarrollo de Software Multiplataforma, desarrollada conforme al Manual Metodológico de la **UTSLRC**.