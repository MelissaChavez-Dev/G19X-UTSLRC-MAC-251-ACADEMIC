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

- **GitHub Copilot:** apoyo para redactar, revisar y desarrollar código y funcionalidades; las decisiones técnicas se validan y explican desde el propio código del proyecto.
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
   Copia la plantilla `env.example` como `.env.local` en la raíz del proyecto y reemplaza cada valor con la configuración de la aplicación web de tu proyecto Firebase (Firebase Console → Configuración del proyecto → Tus apps). El repositorio no incluye claves ni credenciales de prueba; usa los valores de tu propio proyecto.
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

El frontend usa Cloud Functions, reglas de Firestore y Storage. Las variables de `env.example` configuran el SDK web; no crean ni despliegan la base de datos.

Para desplegar el backend en un proyecto propio se requiere Firebase CLI, Python 3.14 (runtime de `firebase.json`), un proyecto con el plan y servicios necesarios y el secreto `GEMINI_API_KEY` configurado en Firebase. Selecciona el proyecto con `firebase use --add` (esto crea un `.firebaserc` local, ignorado por Git) y despliega con `firebase deploy`. Las credenciales de servicio no deben guardarse en el repositorio.


## 5. Datos de encuestas y privacidad

Las rutas para responder encuestas requieren una cuenta activa. `submit_survey_response` valida plantilla, periodo, departamento y respuestas, y en una transacción registra la respuesta y el control de unicidad por colaborador y ciclo. El documento analítico no contiene el UID; el control de completado, que sí contiene el UID, solo puede leerlo su propietario. Las reglas bloquean la lectura de respuestas para colaboradores y toda escritura directa desde el navegador; la administración consulta las respuestas desidentificadas para analítica.

No se generan respuestas sintéticas ni se incluyen filtros de origen en la aplicación. Las respuestas nuevas solo se etiquetan como versión actual cuando contienen los seis factores directos; los registros anteriores se excluyen de las métricas psicosociales. Los registros históricos sintéticos también se excluyen de las consultas analíticas y no se eliminan automáticamente de Firestore.

---

## 6. Usuarios y Acceso al Sistema

El sistema utiliza los roles `admin` y `employee`; no hay autorregistro abierto. Las cuentas y contraseñas se aprovisionan individualmente desde Firebase Authentication y Gestión de Usuarios. 

Las cuentas `employee` responden encuestas para el departamento asignado a su perfil; la administración puede responder para un departamento seleccionado. La administración también puede revisar calidad de datos, actividad digital, permisos, equipos y reportes.

Es necesario iniciar sesián con las cuentas autenticadas para correr el programa, estas se encuentran en CREDENCIALES DE ACCESO.md dentro de la carpeta privada que se le entregó al evaluador. 

--- 

## 7. Estructura del Repositorio

```text
├── Arquitectura/              # Diagramas y documentación de arquitectura
├── docs/                      # PRD y especificación del MVP
├── Evidencias/                # Capturas de evidencia (vacía hasta agregar capturas)
├── Fichas_KPIs_Dashboard_Salud_Organizacional.md # Definiciones y fichas de KPIs
├── functions/
│   ├── main.py                # Cloud Functions: cuentas, encuestas, permisos, equipos y presencia
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
├── env.example                # Plantilla de variables de entorno web
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

Las capturas reales de ejecución y validación pueden añadirse en `Evidencias/`; no se declaran resultados de compilación o advertencias sin una ejecución registrada.

---

## 9. Stack Tecnológico

- **Frontend:** React 19, Vite 8, Tailwind CSS v4, Framer Motion.
- **Gráficos e Interactividad:** Recharts, `@dnd-kit/core`, `@dnd-kit/sortable`, Medidores SVG reactivos a la medida.
- **Base de Datos y Autenticación:** Firebase Authentication y Cloud Firestore.
- **Inteligencia Artificial:** Google Gemini API (`gemini-3.8-flash`).
- **Exportaciones:** `jspdf`, `jspdf-autotable`, `xlsx` (SheetJS).

---

## 10. Notas Académicas

Este repositorio forma parte de la documentación técnica y entregable de la **Memoria de Estadía Profesional** para la obtención del título de TSU en Desarrollo de Software Multiplataforma, desarrollada conforme al Manual Metodológico de la **UTSLRC**.