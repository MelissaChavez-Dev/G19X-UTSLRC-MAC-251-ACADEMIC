# Dashboard Ejecutivo y Plataforma de Salud Organizacional

Proyecto de estadía profesional desarrollado por **Melissa Alejandra Chávez** para la carrera de TSU en Desarrollo de Software Multiplataforma en la **Universidad Tecnológica de San Luis Río Colorado (UTSLRC)**.

---

## 1. Descripción del Proyecto

Aplicación web integral que consolida y analiza indicadores de salud organizacional (bienestar laboral, eNPS, ausentismo digital, rotación, clima laboral, desempeño y factores psicosociales alineados con ISO 45003). 

Cuenta con una **doble experiencia**:
- **Experiencia Ejecutiva (Dirección / RH):** Tableros interactivos con KPIs en tiempo real, medidor de eNPS tipo termómetro semicircular con caras expresivas, matriz de riesgo departamental, tendencias históricas, exportación formal a PDF/Excel y un panel de asesoría estratégica impulsado por Inteligencia Artificial (Google Gemini) que convierte diagnósticos cualitativos en tareas de equipo.
- **Experiencia Colaborativa (Empleados):** Portal de colaboradores (`/mi-espacio`), contestación ágil de encuestas segmentadas, seguimiento de tareas de bienestar en tableros Kanban (`/mis-proyectos`) y resumen transparente de presencia digital para esquemas de trabajo remoto e híbrido.

---

## 2. Requisitos Previos

- **Node.js:** Versión 18.0 o superior (recomendada v20 o v24).
- **npm:** Gestor de paquetes incluido con Node.js.
- **Firebase:** Proyecto activo con Firebase Authentication y Cloud Firestore configurados (se refiere a las API en .env.local, estas mismas las puede encontrar en KEYS.txt)

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
   Crea o verifica el archivo `.env.local` en la raíz del proyecto con la configuración del proyecto en Firebase:
   las claves con datos de prueba estan en KEYS.txt
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

---

## 5. Datos de Prueba

La aplicación **no carga respuestas de prueba automáticamente** ni incluye un comando de seed como parte del flujo de instalación. Las respuestas de encuestas y demás datos de prueba que utiliza el Dashboard son ingresados manualmente por la propietaria del proyecto en la base de datos de Firebase. Al clonar e iniciar la aplicación, Firebase debe contener los datos que se desean visualizar.

---

## 6. Usuarios y Acceso al Sistema

El sistema utiliza los roles `admin` y `employee`; no hay autorregistro abierto. Las cuentas configuradas en Firebase son cuentas de prueba personales de la propietaria del proyecto, no cuentas de empleados reales.

### Credenciales de Acceso

#### A. Cuenta de Administrador (Dirección / RH)
- **Correo electrónico:** `admin@develop.com`
- **Contraseña de prueba actual:** `12345678`
- **Pantalla a la que entra automáticamente:** `/dashboard` (Dashboard Ejecutivo principal).
- **Funcionalidades exclusivas:**
  - Visualización y filtrado del Dashboard Ejecutivo.
  - Exportación de reportes formales en **PDF** y **Excel** multipestaña.
  - Generación de diagnósticos con IA (Gemini) y conversión a tareas.
  - **Gestión de Usuarios** (`/admin/usuarios`): Alta de colaboradores, asignación de roles, edición de horarios de trabajo y reseteo de contraseñas.
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
  - Resumen de presencia y actividad digital personal.

> **Nota de seguridad:** `12345678` es una contraseña compartida únicamente para el entorno de pruebas actual, cuyas cuentas son personales de la propietaria. No debe usarse en producción ni en cuentas reales. Cambia las credenciales antes de desplegar la aplicación públicamente.

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
