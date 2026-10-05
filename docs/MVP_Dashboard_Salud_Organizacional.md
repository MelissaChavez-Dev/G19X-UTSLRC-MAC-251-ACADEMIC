# MVP — Plataforma y Dashboard Ejecutivo de Salud Organizacional

**Proyecto:** Dashboard Ejecutivo y Plataforma de Salud Organizacional  
**Empresa:** Organización participante (nombre provisional)  
**Autora:** Melissa Alejandra Chávez  
**Programa:** Memoria de Estadía de TSU — UTSLRC  
**Repositorio:** github.com/yamyam1805/dashboard-ejecutivo-salud-organizacional  
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
| **Matriz de Riesgo Psicosocial** | Heatmap interactivo Departamentos × Factores con semaforización cromática y alertas tempranas de contingencia. | **Completado** |
| **Panel de Estrategia con IA (Gemini)** | Síntesis ejecutiva de comentarios abiertos, generación de 3 recomendaciones estructuradas y conversión automática en tareas de equipo. | **Completado** |
| **Composición Visual y Minimizado** | Panel de IA minimizable/expandible con despliegue de ilustraciones dinámicas (`ilust3.png` al minimizar, `ilust4.png` bajo el heatmap al expandir con análisis). | **Completado** |
| **Métricas Operativas** | Indicadores de ausentismo digital, rotación proyectada a 90 días y desempeño promedio, con apoyo visual (`ilust 2.png`). | **Completado** |
| **Filtro Departamental y Exportación** | Filtro dinámico en cabecera (`TopBar`), exportación de reporte ejecutivo formal a PDF y exportación de libro de cálculo en Excel (hojas múltiples). | **Completado** |
| **Constructor de Encuestas (`SurveyBuilder`)** | Editor visual de preguntas con biblioteca de componentes, arrastre interactivo con `@dnd-kit`, ciclos de encuesta y asignación por departamento. | **Completado** |
| **Ejecutor de Encuestas (`SurveyRunner`)** | Interfaz tipo Typeform (paso a paso), responsiva, con registro directo en Firestore y prevención de respuestas duplicadas. | **Completado** |
| **Espacio del Empleado (`/mi-espacio`)** | Portal individual para ver encuestas pendientes, tarjeta de unión a equipo (`JoinTeamCard`) y resumen personal de presencia. | **Completado** |
| **Tableros Kanban por Equipo** | Tableros colaborativos (`/mis-proyectos` y `/equipos/:teamId`) con 3 columnas (*Por hacer*, *En progreso*, *Completado*) y drag-and-drop. | **Completado** |
| **Directorio de Equipos (`TeamDirectory`)** | Administración de equipos, integrantes destacados con badges aqua y códigos únicos de unión (`joinCode`). | **Completado** |
| **Gestión de Usuarios y Seguridad** | Creación administrativa de cuentas, contraseñas temporales, forzado de cambio de clave en primer inicio y control de acceso por roles (`admin`, `team_lead`, `employee`). | **Completado** |
| **Monitoreo de Presencia Digital** | Registro no invasivo de actividad (`activityLogs`) contrastado contra horarios de trabajo asignados. | **Completado** |
| **Diseño y Tema Claro/Oscuro** | Sistema de diseño de acentos por zona ("Executive Pulse"): lienzo base `#FFFCF7`, paleta pastel armonizada y soporte completo a modo oscuro (`.dark`). | **Completado** |

---

## 3. Historias de Usuario Validadas en el MVP

- **HU-01 (Dirección General):** *"Como director general, quiero visualizar en un solo vistazo la salud neta (eNPS) y el mapa de riesgos psicosociales para tomar decisiones estratégicas informadas."* **[Cumplida]**
- **HU-02 (Dirección General):** *"Como directivo, quiero que la IA sintetice los comentarios cualitativos y proponga 3 acciones prioritarias que pueda convertir directamente en tareas para los equipos."* **[Cumplida]**
- **HU-03 (Capital Humano):** *"Como responsable de talento, quiero exportar reportes en PDF y Excel para presentar resultados en comités directivos sin elaborar informes manuales."* **[Cumplida]**
- **HU-04 (Colaborador):** *"Como empleado, quiero responder encuestas de bienestar de forma confidencial y rápida desde cualquier dispositivo."* **[Cumplida]**
- **HU-05 (Líder / Integrante de Equipo):** *"Como miembro de un equipo, quiero visualizar las tareas derivadas de bienestar en un tablero Kanban para dar seguimiento continuo a las mejoras."* **[Cumplida]**
- **HU-06 (Administrador):** *"Como administrador, quiero gestionar usuarios y equipos de forma segura, garantizando que el personal cambie su contraseña provisional al primer acceso."* **[Cumplida]**

---

## 4. Criterios de Aceptación Cumplidos

1. **Persistencia y Tiempo Real:** Todas las respuestas de encuesta, tareas de Kanban y registros de presencia se almacenan y consultan en Firebase Firestore.
2. **Inteligencia Artificial Operativa:** La API de Google Gemini procesa datos agregados y texto libre en tiempo de ejecución, entregando recomendaciones ejecutivas y explicaciones de métricas individuales.
3. **Flujo Cerrado Diagnóstico-Acción:** La conversión de recomendaciones de IA a tarjetas en `teams/{teamId}/tasks` opera de forma inmediata sin fricción.
4. **Integridad de Accesos:** Rutas protegidas mediante `ProtectedRoute` y `RoleBasedRedirect` según el perfil autenticado.
5. **Calidad de Compilación:** El proyecto compila limpiamente (`npm run build`) en Vite con cero advertencias de sintaxis y compatibilidad multiplataforma.

---

## 5. Trabajo Futuro y Recomendaciones (Fase Posterior)

1. Automatización de notificaciones por correo electrónico corporativo al publicarse nuevas encuestas o asignarse tareas.
2. Integración directa (vía API/Webhooks) con herramientas de comunicación corporativa (Slack / Microsoft Teams).
3. Evaluaciones periódicas tipo 360 grados y encuestas de pulso automáticas calendarizadas.
4. Integración opcional con plataformas de nómina y RRHH existentes en la organización.

---

## 6. Sustento para la Memoria de Estadía de TSU

Este documento certifica el alcance funcional implementado por **Melissa Alejandra Chávez** para su proyecto de titulación en la Universidad Tecnológica de San Luis Río Colorado (UTSLRC). Demuestra el cumplimiento de los requerimientos de desarrollo de software multiplataforma, integrando arquitectura en la nube, interfaces modernas accesibles, seguridad basada en roles y servicios avanzados de Inteligencia Artificial.
