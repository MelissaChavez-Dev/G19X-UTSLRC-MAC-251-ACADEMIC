# PRD — Dashboard Ejecutivo de Salud Organizacional

**Proyecto:** Dashboard Ejecutivo de Salud Organizacional
**Empresa:** PluriOne S.A. de C.V. — Develop Talent & Technology
**Autora:** Melissa Alejandra Chávez
**Programa:** TODO Academy — Universidad Tecnológica de San Luis Río Colorado
**Repositorio:** github.com/yamyam1805/dashboard-ejecutivo-salud-organizacional
**Fecha:** Septiembre 2026
**Estado del documento:** v2.0 — reemplaza la v1.0 (stack Azure/PostgreSQL descartado)

---

## 1. Resumen ejecutivo

Develop Talent & Technology carece de un mecanismo centralizado para monitorear la salud organizacional de su capital humano. Los indicadores de bienestar, ausentismo, rotación, clima laboral, desempeño y factores psicosociales se encuentran dispersos en distintas fuentes y formatos, lo que obliga a generar reportes de forma manual y retrasa la toma de decisiones estratégicas.

Este PRD define los requerimientos para desarrollar **PluriOne Health**, un dashboard ejecutivo que consolide dichos indicadores en tableros interactivos, con apoyo de inteligencia artificial (Gemini) para la generación de alertas e interpretación de tendencias, dirigido a la alta dirección de la empresa.

El proyecto es de autoría individual de Melissa Alejandra Chávez, desarrollado dentro del periodo de capacitación de TODO Academy, y forma parte de la memoria de estadía conjunta que evalúa la efectividad de dicha capacitación (junto con el motor de segmentación de clientes, proyecto independiente de su compañero de memoria).

---

## 2. Problema a resolver

- La información de salud organizacional está dispersa entre áreas, sin un punto único de consulta.
- La generación de reportes depende de procesos manuales, con alto consumo de tiempo y riesgo de inconsistencias entre versiones de un mismo indicador.
- No existen tableros con tendencias históricas ni alertas ante desviaciones, por lo que la detección de problemas (ej. incremento de rotación, deterioro de clima laboral) es reactiva.
- Las decisiones estratégicas de talento se sustentan más en percepción que en evidencia consolidada.

## 3. Objetivo del producto

Desarrollar un dashboard ejecutivo que integre datos de encuestas de bienestar y los presente, mediante visualizaciones interactivas y análisis generado por IA, como indicadores estratégicos que la alta dirección pueda usar para la toma de decisiones.

### 3.1 Objetivos específicos

| # | Objetivo | Finalidad |
|---|----------|-----------|
| 1 | Identificar los KPIs de salud organizacional | Definir las métricas que integrará el dashboard |
| 2 | Diseñar la arquitectura del sistema (Firestore + Cloud Functions) | Establecer el flujo de datos entre la encuesta, el repositorio y el tablero |
| 3 | Construir el motor de encuestas | Generar la fuente de datos que alimenta el dashboard |
| 4 | Desarrollar una aplicación web con tableros interactivos | Presentar visualmente los indicadores estratégicos a la dirección |
| 5 | Incorporar funcionalidades de IA (Gemini) a nivel macro y micro | Generar recomendaciones estratégicas y explicar gráficas individuales |
| 6 | Validar la calidad y consistencia de la información | Garantizar la confiabilidad del tablero |
| 7 | Elaborar documentación técnica | Facilitar el mantenimiento y sustentar el capítulo de Desarrollo Técnico de la memoria |

## 4. Usuarios objetivo

| Perfil | Rol respecto al producto | Necesidad principal |
|--------|--------------------------|----------------------|
| Alta dirección (CHRO / Dirección general) | Usuario final principal | Visualizar el estado de salud organizacional de un vistazo y recibir recomendaciones accionables |
| Empleados | Usuario de la encuesta | Responder pulsos de bienestar de forma rápida y confidencial |
| Administrador del sistema (rol futuro) | Gestor de encuestas | Construir y publicar nuevas encuestas sin depender de desarrollo |

## 5. Alcance

### 5.1 Dentro de alcance
- Encuesta de bienestar tipo Typeform (una pregunta por pantalla), conectada a Firestore.
- Dashboard ejecutivo con KPIs: eNPS, riesgo de rotación a 90 días, muestra activa de pulso, índice de seguridad psicológica.
- Heatmap de riesgo psicosocial (departamentos × factores, basado en marcadores tipo ISO 45003).
- Panel de IA a nivel macro: botón "Generar estrategia" que analiza el cohorte completo con Gemini y devuelve recomendaciones accionables en Markdown.
- Panel de IA a nivel micro: análisis contextual al expandir una gráfica individual.
- Tendencia semanal de sentimiento y "focos de fricción urgentes".
- Análisis de sentimiento de texto libre mediante Gemini.
- Autenticación de acceso mediante Firebase Authentication.
- Datos simulados (dataset sintético generado por script, no datos reales de empleados).

### 5.2 Dentro de alcance si el tiempo lo permite (no bloqueante para el MVP)
- Form builder de encuestas con biblioteca de bloques (drag-and-drop simplificado).
- Animación de expansión de gráficas con Framer Motion (modo enfoque/modal).

### 5.3 Fuera de alcance
- Pulse surveys programadas automáticamente (envío periódico).
- Kanban de seguimiento de recomendaciones de RH.
- Integración con sistemas de nómina o CRM reales de terceros.
- Aplicación móvil nativa.
- Multiidioma.
- Datos reales de empleados de la empresa.

## 6. Requerimientos funcionales

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| RF-01 | El sistema debe permitir a un empleado responder una encuesta de bienestar y almacenar la respuesta en Firestore | Alta |
| RF-02 | El sistema debe presentar tableros interactivos con los KPIs de salud organizacional definidos | Alta |
| RF-03 | El sistema debe mostrar un heatmap de riesgo psicosocial por departamento y factor | Alta |
| RF-04 | El sistema debe mostrar tendencias históricas (semanal) de al menos un indicador | Alta |
| RF-05 | El sistema debe generar, mediante Gemini, un análisis estratégico a nivel macro a partir de los datos agregados | Alta |
| RF-06 | El sistema debe generar, mediante Gemini, un análisis contextual al expandir una gráfica específica | Media |
| RF-07 | El sistema debe clasificar el sentimiento del texto libre de las respuestas mediante Gemini | Media |
| RF-08 | El sistema debe validar que los datos no tengan valores nulos o duplicados antes de mostrarlos | Alta |
| RF-09 | El sistema debe requerir autenticación mediante Firebase Authentication para acceder al dashboard | Alta |
| RF-10 | El sistema debe contar con documentación técnica que describa su arquitectura y despliegue | Media |

## 7. Requerimientos no funcionales

| ID | Requerimiento | Descripción |
|----|---------------|-------------|
| RNF-01 | Seguridad | Autenticación mediante Firebase Auth; reglas de seguridad de Firestore que impidan lectura/escritura no autorizada; API key de Gemini nunca expuesta en el frontend (se invoca desde Cloud Functions) |
| RNF-02 | Escalabilidad | La estructura de Firestore debe permitir agregar nuevos tipos de pregunta o indicador sin rediseño mayor |
| RNF-03 | Usabilidad | Los tableros deben ser comprensibles para perfiles no técnicos (dirección), siguiendo el sistema de diseño "Executive Pulse" (paleta, tipografía Inter, componentes definidos en DESIGN.md) |
| RNF-04 | Mantenibilidad | Historial de commits en GitHub con mensajes descriptivos y avance incremental verificable (evidencia de trabajo sostenido, no de última hora) |
| RNF-05 | Consistencia visual | El frontend debe respetar fielmente los mockups y tokens de diseño entregados (colores semánticos, radios, sombras, tipografía) |

## 8. Stack tecnológico

- **Frontend:** React.js (Vite) + Tailwind CSS + Framer Motion
- **Visualización:** Recharts / Tremor
- **Backend / datos:** Firebase Authentication, Firestore
- **Funciones en la nube:** Cloud Functions (Python 3.8+), como capa intermedia hacia Gemini
- **Inteligencia artificial:** Gemini API (`gemini-3.8-flash`)
- **Control de versiones:** Git / GitHub
- **Diseño:** Sistema de diseño "Executive Pulse" (Stitch) — paleta, tipografía Inter, espaciados y componentes ya definidos
- **Metodología de trabajo:** Scrum, con sprints diarios dado el periodo comprimido de desarrollo

## 9. Arquitectura (visión general)

```
Encuesta de bienestar (React) ──► Firestore (responses)
                                        │
                                        ▼
                              Datos simulados + reales de encuesta
                                        │
                                        ▼
                     Cloud Functions (Python) — agregación de KPIs
                                        │
                          ┌─────────────┴─────────────┐
                          ▼                            ▼
                  Dashboard (React)            Gemini API (gemini-3.8-flash)
                  KPIs, heatmap, tendencias     Análisis macro / micro / sentimiento
                          │                            │
                          └─────────────┬──────────────┘
                                        ▼
                        Panel de IA (recomendaciones en Markdown)
```

## 10. Métricas de éxito

| Métrica | Meta esperada |
|---------|----------------|
| Funcionalidad de punta a punta | La encuesta alimenta datos reales al dashboard (no datos hardcodeados para la demo) |
| Cobertura de KPIs | Los 4 KPIs principales (eNPS, riesgo de rotación, muestra activa, índice de seguridad psicológica) visibles y calculados desde Firestore |
| Fidelidad al diseño | El dashboard implementado corresponde visualmente a los mockups de Stitch |
| Evidencia de desarrollo incremental | Historial de commits en GitHub con avance diario verificable durante el periodo de desarrollo |
| Valor como evidencia académica | El proyecto sustenta el capítulo de Desarrollo Técnico y Resultados de la memoria de estadía |

## 11. Supuestos y restricciones

- El desarrollo se realiza de forma individual, en un periodo comprimido de 10 días (22 de septiembre al 2 de octubre de 2026), no en las ~12 semanas típicas de una estadía completa.
- Se trabaja con datos simulados, generados mediante script, no con datos reales de empleados de la empresa.
- El acceso a la API de Gemini y a los servicios de Firebase está disponible sin restricciones durante el desarrollo.
- El proyecto se desarrolla bajo modalidad remota, dentro del programa TODO Academy.
- El compañero de memoria desarrolla su propio proyecto (motor de segmentación de clientes) con un stack distinto (Azure), de forma completamente independiente a nivel técnico.

## 12. Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Tiempo de desarrollo muy acotado (10 días, trabajo individual) | Alto | Priorización estricta vía MVP; funcionalidades "si el tiempo lo permite" claramente separadas del núcleo |
| Dependencia de servicios en la nube (Firebase, Gemini) | Medio | Documentar configuración y variables de entorno; `.gitignore` protege credenciales desde el primer commit |
| Datos simulados poco realistas | Medio | Calibrar el generador de datos contra los rangos que muestran los mockups (ej. eNPS ~72, riesgo de rotación ~12%) |
| Discrepancia entre el stack real y la ficha técnica original de la empresa (que mencionaba Azure) | Bajo | Documentado explícitamente en la memoria como cambio de stack autorizado a nivel de desarrollo individual |

## 13. Referencias

- Ficha técnica del proyecto: *Proyecto de Desarrollo de un Dashboard Ejecutivo de Salud Organizacional* — PluriOne S.A. de C.V. / Develop Talent & Technology.
- Manual Metodológico para la Elaboración de Memoria de Estadía de TSU — UTSLRC (2023).
- Sistema de diseño "Executive Pulse" — exportación Stitch (DESIGN.md), mockups: dashboard ejecutivo, encuesta de bienestar, form builder.
