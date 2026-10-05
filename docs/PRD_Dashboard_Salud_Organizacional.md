# PRD — Plataforma y Dashboard Ejecutivo de Salud Organizacional

**Proyecto:** Dashboard Ejecutivo y Plataforma de Salud Organizacional  
**Empresa:** Organización participante (nombre provisional)  
**Autora:** Melissa Alejandra Chávez  
**Programa:** Memoria de Estadía de TSU — UTSLRC  
**Repositorio:** github.com/yamyam1805/dashboard-ejecutivo-salud-organizacional  
**Versión:** 3.0 (Documento Integral Unificado — Núcleo Ejecutivo y Expansión Colaborativa)  
**Fecha de actualización:** Octubre 2026  

---

## 1. Resumen Ejecutivo

La organización participante carecía de un mecanismo centralizado y automatizado para evaluar, diagnosticar y dar seguimiento a la salud organizacional de su talento humano. Los indicadores de bienestar, ausentismo, rotación, carga laboral, desempeño y clima organizacional se encontraban dispersos o se gestionaban de manera manual y reactiva.

Este **Product Requirement Document (PRD)** define las especificaciones integrales de la **Plataforma de Salud y Bienestar Organizacional**, una solución web completa que unifica dos experiencias:
1. **Experiencia Ejecutiva (Dirección / RH):** Tableros de control con KPIs calculados en tiempo real, matriz de riesgo psicosocial (alineada con factores tipo ISO 45003), tendencias históricas, alertas tempranas, exportación ejecutiva (PDF/Excel) y un panel de asesoría estratégica impulsado por Inteligencia Artificial (Gemini) que convierte hallazgos diagnósticos en tareas operativas.
2. **Experiencia Colaborativa (Empleados):** Portal personal (`/mi-espacio`), contestación de encuestas segmentadas por departamento, tableros Kanban interactivos para seguimiento de proyectos y visibilidad transparente de presencia digital para esquemas de trabajo híbridos o remotos.

---

## 2. Problema a Resolver y Justificación

- **Dispersión y fragmentación:** La información de bienestar y factores psicosociales residía en hojas de cálculo aisladas sin correlación con el desempeño ni con los equipos de trabajo.
- **Toma de decisiones reactiva:** Ausencia de indicadores en tiempo real y alertas automáticas; los problemas de retención o agotamiento se detectaban cuando el colaborador ya renunciaba o reducía su rendimiento.
- **Desconexión entre el diagnóstico y la acción:** Las encuestas tradicionales de clima laboral arrojaban reportes estáticos que rara vez se traducían en planes de acción ejecutables o medibles por equipo.
- **Inconsistencia en el monitoreo remoto:** Necesidad de monitorear la salud y presencia del equipo sin caer en prácticas invasivas ni vulnerar la privacidad del colaborador.

---

## 3. Objetivos del Producto

### 3.1 Objetivo General
Desarrollar e implementar una plataforma web con dashboard ejecutivo y módulos colaborativos que recopile datos de bienestar mediante encuestas activas, calcule métricas de salud organizacional y genere diagnósticos y tareas de intervención apoyados por Inteligencia Artificial para la toma de decisiones estratégicas.

### 3.2 Objetivos Específicos
1. **Centralización de KPIs:** Integrar en un solo panel métricas de salud neta (eNPS), presión laboral, seguridad psicológica, participación, rotación y presencia digital.
2. **Diagnóstico Psicosocial Continuo:** Proveer una matriz de riesgo (heatmap) clasificada por departamento y factores organizacionales críticos.
3. **Asesoría Estratégica con IA (Gemini):** Automatizar el análisis cualitativo y cuantitativo con recomendaciones ejecutivas estructuradas y vinculables directamente a planes de trabajo.
4. **Cierre de Ciclo Diagnóstico-Acción (Kanban):** Permitir a la dirección y a los líderes convertir recomendaciones de IA o acuerdos internos en tarjetas de trabajo asignables y rastreables.
5. **Gestión Flexible de Encuestas:** Brindar un constructor visual de encuestas (`SurveyBuilder`) y un ejecutor interactivo (`SurveyRunner`) con segmentación departamental y ciclos programados.
6. **Seguridad y Control de Acceso por Roles:** Garantizar autenticación robusta, cambio obligatorio de credenciales temporales y permisos delimitados para Administradores, Líderes de Equipo y Empleados.
7. **Reportes y Usabilidad Ejecutiva:** Ofrecer exportación formal a PDF y Excel multipestaña, así como un sistema de diseño con paleta accesible, modo oscuro y visualizaciones intuitivas.

---

## 4. Usuarios y Modelo de Roles

### 4.1 Definición de Perfiles

| Rol | Usuario | Propósito y Alcance de Acceso |
|---|---|---|
| **`admin`** | Dirección / propietaria del entorno | Acceso al Dashboard Ejecutivo (`/dashboard`), Gestión de Usuarios (`/admin/usuarios`), Directorio de Equipos (`/equipos`), tableros de equipo, Form Builder de Encuestas (`/survey-builder`), reportes y descargas PDF/Excel. |
| **`employee`** | Colaborador | Portal personal (`/mi-espacio`), contestación de encuestas pendientes dirigidas a su área (`/encuesta/:templateId`), unión a equipo mediante código (`JoinTeamCard`), tablero de equipo (`/mis-proyectos`) y resumen de presencia digital. |

### 4.2 Flujo de Alta y Autenticación
1. **Alta centralizada por Administrador:** No existe autorregistro abierto. La administradora crea las cuentas necesarias desde `/admin/usuarios`.
2. **Control de roles:** El sistema utiliza los roles `admin` y `employee`; no se utiliza el rol `team_lead`.
3. **Redirección condicional (`RoleBasedRedirect`):** Según el rol asignado, el sistema conduce al administrador a `/dashboard` y al empleado a `/mi-espacio`.

**Entorno de pruebas actual:** Las cuentas existentes son cuentas de prueba personales de la propietaria, no cuentas de empleados reales. Sus contraseñas se establecieron en `12345678` para pruebas exclusivamente. Esta contraseña no es apropiada para producción y debe cambiarse antes de cualquier despliegue público.

---

## 5. Arquitectura del Sistema y Stack Tecnológico

### 5.1 Stack de Desarrollo
- **Frontend SPA:** React 19 + Vite 8.
- **Estilos y Sistema Visual:** Tailwind CSS v4 + Framer Motion (transiciones y microinteracciones fluidas).
- **Iconografía y Tipografía:** Google Material Symbols Outlined + Bricolage Grotesque / Figtree.
- **Gráficas y Visualización:** Recharts + Componentes SVG reactivos a la medida (Medidor eNPS tipo termómetro con estados de ánimo).
- **Arrastre e Interacción (DnD):** `@dnd-kit/core` y `@dnd-kit/sortable` para el constructor de encuestas y los tableros Kanban.
- **Backend as a Service:** Firebase Authentication + Cloud Firestore.
- **Inteligencia Artificial:** Google Gemini API (`gemini-3.8-flash`) integrada vía servicio seguro para síntesis ejecutiva, análisis de texto libre y explicaciones contextuales.
- **Exportación de Reportes:** `jspdf` + `jspdf-autotable` (reportes PDF ejecutivos) y `xlsx` (libros de cálculo Excel con hojas segregadas).

### 5.2 Modelo de Colecciones en Firestore
- **`users/{uid}`**: Perfil del usuario (`displayName`, `email`, `role`, `departmentId`, `teamId`, `workSchedule`, `mustChangePassword`, `active`).
- **`teams/{teamId}`**: Datos de equipo (`name`, `departmentId`, `leaderId`, `joinCode`, `memberIds`, `createdAt`).
- **`teams/{teamId}/tasks/{taskId}`**: Tarjetas de trabajo del Kanban (`title`, `description`, `status`, `origin: "ai_recommendation" | "manual"`, `sourceMetric`, `assignedTo`, `createdAt`, `updatedAt`).
- **`surveyTemplates/{templateId}`**: Plantillas creadas (`title`, `status`, `targetDepartments`, `cycle`, `questions[]`).
- **`responses/{responseId}`**: Respuestas individuales procesadas (`enps`, `factors`, `openComments`, `departmentId`, `submittedAt`).
- **`surveyCompletions/{completionId}`**: Registro de control para evitar duplicidad de respuestas por ciclo y colaborador.
- **`activityLogs/{logId}`**: Registro no invasivo de presencia digital (`userId`, `type`, `timestamp`).
- **`departments/{deptId}`**: Catálogo de áreas organizacionales y headcounts asignados.

---

## 6. Módulos y Requerimientos Funcionales

### 6.1 Dashboard Ejecutivo (`/dashboard`)
- **RF-D01: Medidor eNPS Semicircular (Termómetro con Caras Emocionales):**
  - Indicador principal en forma de medidor reactivo de −100 a +100 puntos.
  - Aguja dinámica que rota según el puntaje exacto consolidado de respuestas.
  - 4 rangos semánticos con glifos expresivos de estados de ánimo: *Bajo* (≤ −11, triste), *Bueno* (−10 a 19, neutro), *Muy bueno* (20 a 39, sonriente), y *Excelente* (≥ 40, alegre).
  - Indicación numérica central limpia y comparativo de variación delta frente al periodo anterior.
- **RF-D02: Métricas de Pulso Complementarias:**
  - *Índice de presión laboral:* Evaluación sobre 100 puntos de carga y fricción operativa.
  - *Participación en pulsos:* Porcentaje semanal y promedio de respuestas sobre el headcount real.
  - *Seguridad psicológica:* Promedio sobre 5.0 puntos de libertad de expresión y confianza en el entorno.
  - Modal de análisis micro con Gemini al interactuar con cualquier tarjeta.
- **RF-D03: Matriz de Riesgo Psicosocial (`RiskHeatmap`):**
  - Malla bidimensional Departamentos × Factores con código de color semántico (Riesgo Bajo, Moderado, Alto, Crítico).
  - Banners de alerta temprana ante variaciones críticas.
- **RF-D04: Tendencias Históricas y Focos de Fricción:**
  - Gráfica de evolución semanal de bienestar y listado de focos urgentes de atención.
- **RF-D05: Panel de Estrategia con Inteligencia Artificial (`AIStrategistPanel`):**
  - Síntesis de comentarios abiertos y métricas cuantitativas vía Gemini.
  - Generación de 3 acciones prioritarias estructuradas.
  - Botón integrado **"Convertir en tarea"** para derivar recomendaciones de IA a los tableros de equipo.
  - Modo minimizable/expandible con control condicional y soporte visual adaptativo: despliegue de ilustración conceptual (`ilust3.png`) en modo minimizado, e ilustración decorativa (`ilust4.png`) debajo de la matriz de riesgo únicamente cuando existe análisis generado y el panel se encuentra expandido.
- **RF-D06: Bloque Operativo:**
  - Métricas de Ausentismo digital, Tasa de rotación proyectada y Desempeño promedio con apoyo visual (`ilust 2.png`).
- **RF-D07: Filtros y Exportaciones:**
  - Filtro global por departamento en cabecera (`TopBar`).
  - Botones de exportación a PDF (informe formal de alta dirección) y Excel (archivo multipestaña con respuestas anonimizadas, matriz y KPIs).

### 6.2 Motor de Encuestas (`SurveyBuilder` y `SurveyRunner`)
- **RF-E01: Constructor de Encuestas (`SurveyBuilder`):** Creación visual de encuestas con biblioteca de preguntas (Likert 1-5, eNPS 0-10, opción múltiple y texto abierto) con reordenamiento arrastrable (`@dnd-kit`) y configuración de departamentos destino.
- **RF-E02: Ejecutor de Encuestas (`SurveyRunner` / `WellnessSurvey`):** Interfaz enfocada (paso a paso), responsiva, con progreso visual, guardado en tiempo real en Firestore y validación de respuesta única por periodo.
- **RF-E03: Datos de prueba:** La aplicación no realiza carga automática de respuestas de muestra. La propietaria ingresa manualmente las respuestas y datos de prueba en Firebase.

### 6.3 Espacio Colaborativo y Tableros Kanban (`/mi-espacio` y `/mis-proyectos`)
- **RF-C01: Mi Espacio:** Vista del empleado que reúne encuestas pendientes, tarjeta de autounión a equipo (`JoinTeamCard`) y resumen de actividad.
- **RF-C02: Tableros Kanban (`TeamKanban` / `TeamBoard`):** Flujo de trabajo en 3 estados (*Por hacer*, *En progreso*, *Completado*) con arrastre interactivo, filtros y soporte para tareas manuales o generadas por IA.
- **RF-C03: Directorio de Equipos (`TeamDirectory`):** Módulo administrativo con tarjetas de equipos, integrantes destacados con badges tonales aqua y generación de códigos de invitación.

### 6.4 Presencia Digital y Ausentismo Remoto
- **RF-P01: Registro No Invasivo:** Captura throttled de eventos relevantes de actividad (login, navegación, envío de encuestas, movimientos en Kanban).
- **RF-P02: Monitoreo Ético:** El ausentismo se calcula confrontando actividad con el horario asignado, presentándose de forma transparente al usuario y agregada para la dirección.

---

## 7. Requerimientos No Funcionales

| ID | Dimensión | Criterio de Cumplimiento |
|---|---|---|
| **RNF-01** | **Seguridad** | Reglas de seguridad en Firestore por colección; protección de credenciales y APIs en entorno seguro; sanitización de salidas Markdown contra XSS con `DOMPurify`. |
| **RNF-02** | **Rendimiento** | Build optimizado con Vite; carga reactiva de datos vía hooks desacoplados; componentes pesados memoizados para evitar re-renderizados innecesarios. |
| **RNF-03** | **Diseño y Accesibilidad** | Sistema de diseño de acentos por zona ("Executive Pulse"): lienzo base `#FFFCF7`, acentos pastel funcionales (azul, salvia, lavanda, durazno y aqua para IA), tipografías legibles y soporte total para modo oscuro (`.dark`). |
| **RNF-04** | **Usabilidad Móvil** | Interfaz totalmente responsiva en escritorio, tabletas y dispositivos móviles. |
| **RNF-05** | **Calidad y Mantenibilidad** | Código modular organizado por capas (`components`, `hooks`, `services`, `pages`, `utils`); compilación limpia sin errores de build. |

---

## 8. Relación con la Memoria de Estadía de TSU

El presente documento constituye la especificación formal del proyecto de estadía profesional de **Melissa Alejandra Chávez** para la carrera de TSU en Desarrollo de Software Multiplataforma (UTSLRC). Sustenta directamente el capítulo de **Desarrollo Técnico del Proyecto** y define el marco metodológico contra el cual se validan los resultados, la arquitectura y las conclusiones de la memoria académica.
