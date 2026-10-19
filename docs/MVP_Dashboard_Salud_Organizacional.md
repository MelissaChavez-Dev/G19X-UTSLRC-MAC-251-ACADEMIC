# MVP — Plataforma y Dashboard Ejecutivo de Salud Organizacional

**Proyecto:** Dashboard Ejecutivo y Plataforma de Salud Organizacional  
**Empresa:** PluriOne / Develop Talent & Technology  
**Autora:** Melissa Alejandra Chávez  
**Programa:** Memoria de Estadía de TSU — UTSLRC  
**Repositorio:** github.com/MelissaChavez-Dev/G19X-UTSLRC-MAC-251-ACADEMIC
**Versión:** 3.0 (Alcance Real Implementado y Consolidado)  
**Fecha de actualización:** Octubre 2026  

---

## 1. Propósito y Evolución del MVP

El objetivo inicial del Producto Mínimo Viable (MVP) fue demostrar la viabilidad técnica y operativa de un tablero de control ejecutivo que integrara encuestas de pulso y recomendaciones automáticas de IA.

Durante el proceso de desarrollo y validación, el MVP evolucionó de un "visualizador de datos para directores" a una **plataforma interactiva de ciclo cerrado**: no solo diagnostica la salud organizacional, sino que permite a los colaboradores responder pulsos segmentados, habilita a los equipos a gestionar planes de acción mediante tableros Kanban y ofrece a la dirección herramientas avanzadas de exportación ejecutiva y monitoreo de presencia digital.

---

## 2. Alcance Implementado del MVP

| Módulo / Funcionalidad | Descripción del Alcance en Producción | Estado |
|---|---|:---:|
| **Medidor eNPS tipo Termómetro** | Medidor semicircular reactivo con aguja animada, escala de −100 a +100 y 4 niveles semánticos con glifos de caras (*Bajo*, *Bueno*, *Muy bueno*, *Excelente*). | **Completado** |
| **KPIs de Salud Organizacional** | Indicadores consolidados de eNPS, Presión Laboral (/100), Participación de Pulso (%) y Seguridad Psicológica (/5.0) con cálculo dinámico en Firestore. | **Completado** |
| **Calidad de datos (`/admin/calidad`)** | Puntaje ponderado de confiabilidad de respuestas, con verificaciones de completitud, rangos, muestra mínima, duplicados y frescura; evalúa un conjunto reciente acotado y la cobertura de fuentes operativas. Solo lectura. | **Completado** |
| **Matriz de Riesgo Psicosocial** | Heatmap interactivo Departamentos × Factores preguntados directamente, inspirados en dimensiones de ISO 45003, sin afirmar conformidad; alertas en la campana del TopBar. | **Completado** |
| **Panel de Estrategia con IA (Gemini)** | Síntesis ejecutiva de comentarios abiertos, generación de 3 recomendaciones estructuradas y conversión automática en tareas de equipo. | **Completado** |
| **Composición Visual y Minimizado** | Panel de IA minimizable/expandible con despliegue de ilustraciones dinámicas (`ilust3.png` al minimizar, `ilust4.png` bajo el heatmap al expandir con análisis). | **Completado** |
| **Métricas Operativas** | Proxies de actividad digital no registrada a 30 días (permisos aprobados y feriados excluidos), bajas de plataforma a 90 días y ejecución de tareas Kanban, filtrables por departamento cuando aplica; no equivalen a asistencia física o desempeño individual. | **Completado** |
| **Actividad digital (`/admin/asistencia`)** | Resumen por fecha y departamento de eventos registrados, permisos aprobados y jornadas sin actividad digital; no mide asistencia física, entrada/salida ni productividad. | **Completado** |
| **Gestión de permisos (`/admin/permisos`)** | Solicitud de incapacidad con comprobante PDF/JPG/PNG de hasta 10 MB; detalle con motivo completo, navegación por pendientes filtrados, aprobación confirmada y rechazo con motivo obligatorio; muestra comprobante, saldo vacacional y traslapes aprobados del departamento, además del calendario. Solo permisos aprobados justifican los días cubiertos. | **Completado** |
| **Filtro Departamental y Exportación** | Filtro dinámico en cabecera (`TopBar`), exportación de reporte ejecutivo formal a PDF y exportación de libro de cálculo en Excel (hojas múltiples). | **Completado** |
| **Constructor de Encuestas (`SurveyBuilder`)** | Editor visual de preguntas con biblioteca de componentes, arrastre interactivo con `@dnd-kit`, ciclos de encuesta y asignación por departamento. | **Completado** |
| **Ejecutor de Encuestas (`SurveyRunner`)** | Interfaz paso a paso y responsiva; requiere sesión y usa una Cloud Function que valida la entrada y evita duplicados por persona/ciclo en servidor. | **Completado** |
| **Espacio del Empleado (`/mi-espacio`)** | Encuestas pendientes, proyectos, resumen personal de actividad, saldo e historial de permisos, formulario de solicitud, edición de nombre/teléfono y carga de foto. | **Completado** |
| **Tableros Kanban por Equipo** | Tableros colaborativos (`/mis-proyectos` y `/equipos/:teamId`) con tres listas iniciales (*Por hacer*, *En progreso* y *Hecho*), opción de agregar, renombrar y eliminar listas vacías, y comentarios con foto pública del autor o iniciales. | **Completado** |
| **Directorio de Equipos (`TeamDirectory`)** | Administración de equipos, integrantes destacados con badges aqua y códigos únicos de unión (`joinCode`). | **Completado** |
| **Gestión de Usuarios y Seguridad** | Directorio con distribución por departamento, identificador, puesto, contratación, fecha de ingreso y foto; creación administrativa y acceso por rol. | **Completado** |
| **Monitoreo de Presencia Digital** | Registro no invasivo de actividad (`activityLogs`) contrastado contra horario y solicitudes aprobadas; es un proxy de uso de la app, no asistencia física. | **Completado** |
| **Diseño y Tema Claro/Oscuro** | Sistema de diseño de acentos por zona ("Executive Pulse"): lienzo base `#FFFCF7`, paleta pastel armonizada y soporte completo a modo oscuro (`.dark`). | **Completado** |

### 2.1 Captura de datos y privacidad

- Las encuestas requieren una sesión activa y se envían mediante `submit_survey_response`, que valida las respuestas en el servidor y limita a una respuesta por persona y ciclo.
- El documento analítico no contiene el UID. El control de completado queda en `surveyCompletions`, es legible solo por su propietario y no guarda una hora que permita cruzarlo directamente con una respuesta.
- Las reglas bloquean las escrituras directas de respuestas y limitan su lectura a la administración. La aplicación no genera respuestas automáticamente; las consultas analíticas filtran `source == "live"`. Existen registros históricos sintéticos en Firestore y cuentas ficticias de prueba; no se versionan IDs ni contraseñas.

---

## 3. Historias de Usuario Validadas en el MVP

- **HU-01 (Dirección General):** *"Como director general, quiero visualizar en un solo vistazo la salud neta (eNPS) y el mapa de riesgos psicosociales para tomar decisiones estratégicas informadas."* **[Cumplida]**
- **HU-02 (Dirección General):** *"Como directivo, quiero que la IA sintetice los comentarios cualitativos y proponga 3 acciones prioritarias que pueda convertir directamente en tareas para los equipos."* **[Cumplida]**
- **HU-03 (Capital Humano):** *"Como responsable de talento, quiero exportar reportes en PDF y Excel para presentar resultados en comités directivos sin elaborar informes manuales."* **[Cumplida]**
- **HU-04 (Colaborador):** *"Como empleado, quiero responder encuestas de bienestar de forma confidencial y rápida desde cualquier dispositivo."* **[Cumplida]**
- **HU-05 (Empleado):** *"Como empleado, quiero visualizar las tareas derivadas de bienestar en un tablero Kanban para dar seguimiento continuo a las mejoras de mi equipo."* **[Cumplida]**
- **HU-06 (Administrador):** *"Como administrador, quiero gestionar las cuentas y equipos de trabajo desde la plataforma."* **[Cumplida]**

---

## 4. Criterios de Aceptación Cumplidos

1. **Persistencia y Tiempo Real:** Todas las respuestas de encuesta, tareas de Kanban y registros de presencia se almacenan y consultan en Firebase Firestore.
2. **Inteligencia Artificial Operativa:** La API de Google Gemini procesa datos agregados y texto libre en tiempo de ejecución, entregando recomendaciones ejecutivas y explicaciones de métricas individuales.
3. **Flujo Cerrado Diagnóstico-Acción:** La conversión de recomendaciones de IA a tarjetas en `teams/{teamId}/tasks` opera de forma inmediata sin fricción.
4. **Integridad de Accesos:** Rutas protegidas mediante `ProtectedRoute` y `RoleBasedRedirect` según el perfil autenticado.
5. **Calidad de Compilación:** La compilación de producción se valida con `npm run build`. La última validación completó correctamente, pero Vite reportó un chunk de JavaScript superior a 500 kB después de minificar; por tanto, no se afirma que exista cero advertencias. El resultado debe registrarse junto con sus advertencias.

---

## 5. Trabajo Futuro y Recomendaciones (Fase Posterior)

1. Automatización de notificaciones por correo electrónico corporativo al publicarse nuevas encuestas o asignarse tareas.
2. Integración directa (vía API/Webhooks) con herramientas de comunicación corporativa (Slack / Microsoft Teams).
3. Evaluaciones periódicas tipo 360 grados y encuestas de pulso automáticas calendarizadas.
4. Integración opcional con plataformas de nómina y RRHH existentes en la organización.

---

## 6. Sustento para la Memoria de Estadía de TSU

Este documento certifica el alcance funcional implementado por **Melissa Alejandra Chávez** para su proyecto de titulación en la Universidad Tecnológica de San Luis Río Colorado (UTSLRC). Demuestra el cumplimiento de los requerimientos de desarrollo de software multiplataforma, integrando arquitectura en la nube, interfaces modernas accesibles, seguridad basada en roles y servicios avanzados de Inteligencia Artificial.
