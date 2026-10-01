# MVP — Dashboard Ejecutivo de Salud Organizacional

**Proyecto:** Dashboard Ejecutivo de Salud Organizacional
**Empresa:** Organización participante (nombre provisional)
**Autora:** Melissa Alejandra Chávez
**Basado en:** PRD_Dashboard_Salud_Organizacional.md (v2.0)
**Ventana de desarrollo:** 22 de septiembre – 2 de octubre de 2026 (10 días, trabajo individual)
**Estado del documento:** v2.0 — reemplaza la v1.0 (stack Azure/PostgreSQL, plazo de 12 semanas)

---

## 1. Propósito del MVP

Definir el conjunto mínimo de funcionalidades que permite demostrar, dentro de una ventana de desarrollo de 10 días, un dashboard ejecutivo funcional de punta a punta: desde la captura de una encuesta de bienestar hasta su visualización como indicadores estratégicos con apoyo de IA — sin depender todavía de las funcionalidades de mayor pulido (form builder completo, animaciones, automatizaciones) contempladas en el PRD.

## 2. Criterio para definir el MVP

Se prioriza lo que:
1. Resuelve directamente el problema central (información dispersa → información consolidada y accionable).
2. Es alcanzable dentro de la ventana real de 10 días de desarrollo individual.
3. Es demostrable de forma funcional (no simulada) ante el sínodo evaluador.

Todo lo que no cumpla estos tres criterios se secuencia al final del cronograma (día 10) o se documenta como trabajo futuro, sin eliminarse de la visión del proyecto.

## 3. Alcance funcional del MVP

### 3.1 Núcleo (días 1–9, no negociable)

| Funcionalidad | Descripción | Objetivo específico relacionado (PRD) |
|----------------|-------------|-----------------------------------|
| Setup del proyecto | Firebase (Auth + Firestore) creado; scaffold React + Vite + Tailwind con los tokens de "Executive Pulse" cargados | Obj. 2 |
| Datos simulados | Script generador de empleados, departamentos y respuestas históricas con tendencia realista, cargado en Firestore | Obj. 6 |
| Encuesta funcional | Encuesta tipo Typeform (estructura fija), una pregunta por pantalla, guardado real en Firestore | Obj. 3 |
| KPIs del dashboard | Tarjetas de eNPS, riesgo de rotación a 90 días, muestra activa de pulso e índice de seguridad psicológica, calculadas desde datos reales | Obj. 4 |
| Heatmap de riesgo psicosocial | Matriz departamentos × factores con codificación de color semántica | Obj. 4 |
| IA — análisis macro | Cloud Function en Python que agrega estadísticas del cohorte y llama a `gemini-3.8-flash`; botón "Generar estrategia" con salida en Markdown | Obj. 5 |
| IA — análisis micro | Al hacer clic en una gráfica, se envían solo sus datos a Gemini y se muestra una explicación contextual (sin animación todavía) | Obj. 5 |
| Sentimiento y tendencias | Clasificación de sentimiento del texto libre y sección de tendencia semanal / focos de fricción | Obj. 5 |
| Autenticación | Acceso controlado mediante Firebase Authentication | RF-09 |
| Documentación mínima | README y notas técnicas de arquitectura y despliegue | Obj. 7 |

### 3.2 Pulido (día 9–10, deseable pero no bloqueante)

| Funcionalidad | Descripción |
|----------------|-------------|
| Animación de expansión de gráficas | Modal con transición fluida (Framer Motion), tal como en el mockup |
| Form builder simplificado | Biblioteca de bloques fija (sin drag-and-drop completo si el tiempo no alcanza) |

### 3.3 Excluido del MVP (fase posterior, fuera de la ventana de 10 días)

| Funcionalidad | Motivo de exclusión |
|----------------|----------------------|
| Pulse surveys programadas automáticamente | Requiere lógica de programación/notificaciones, fuera del núcleo |
| Kanban de seguimiento de recomendaciones | Es un módulo de gestión de tareas, no de visualización de salud organizacional |
| Drag-and-drop completo del form builder | Alto costo de desarrollo frente al beneficio para el objetivo central |
| Integración de fuentes de datos reales de la empresa | Se trabaja con datos simulados por decisión de alcance |

## 4. Historias de usuario (MVP)

| ID | Como... | Quiero... | Para... |
|----|---------|-----------|---------|
| HU-01 | Empleado | Responder una encuesta de bienestar breve y clara | Compartir mi estado sin que me tome mucho tiempo |
| HU-02 | Dirección general | Ver un tablero con los KPIs clave de salud organizacional | Tomar decisiones sin esperar un reporte manual |
| HU-03 | Dirección general | Recibir una recomendación estratégica generada por IA | Saber qué acción priorizar sin interpretar los datos manualmente |
| HU-04 | Dirección general | Hacer clic en una gráfica y obtener una explicación puntual | Entender el "porqué" detrás de un indicador sin salir del dashboard |
| HU-05 | Usuario del sistema | Iniciar sesión de forma segura | Que solo personal autorizado acceda a la información |

## 5. Criterios de aceptación del MVP

- La encuesta guarda respuestas reales en Firestore (no datos hardcodeados para la demo).
- El dashboard muestra los 4 KPIs principales calculados a partir de esos datos.
- El heatmap refleja los datos simulados cargados, no valores fijos en el frontend.
- El botón de análisis macro genera una respuesta real de Gemini (no un texto de ejemplo).
- El acceso al dashboard requiere autenticación funcional.
- Existe al menos un documento técnico breve (README) que describe la arquitectura implementada.
- El repositorio de GitHub muestra un historial de commits distribuido a lo largo de los 10 días, no concentrado en uno o dos días.

## 6. Fuera de alcance total (ni MVP ni fase posterior dentro de esta ventana)

- Aplicación móvil nativa.
- Soporte multiidioma.
- Integración con sistemas de nómina o CRM reales de terceros.
- Datos reales de empleados de la empresa.

## 7. Ruta sugerida después del MVP

1. Completar el form builder con drag-and-drop real.
2. Implementar pulse surveys programadas.
3. Agregar el Kanban de seguimiento de recomendaciones de RH.
4. Evaluar la integración de una fuente de datos real de la empresa, si la confidencialidad lo permite.
5. Formalizar reglas de seguridad de Firestore más granulares por rol.

## 8. Relación con la memoria de estadía

Este documento sustenta directamente el capítulo **Desarrollo Técnico del Proyecto** de la memoria: cada funcionalidad del núcleo corresponde a un día del cronograma real de desarrollo, y los criterios de aceptación pueden usarse como evidencia en el apartado de **Resultados y Discusiones**. Las funcionalidades excluidas del MVP se documentan como **trabajo futuro** en Conclusiones y Recomendaciones, reforzando esa sección en vez de restarle valor al proyecto.
