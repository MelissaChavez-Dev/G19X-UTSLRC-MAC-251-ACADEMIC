# Fichas de KPIs — Dashboard Ejecutivo de Salud Organizacional

**Autora:** Melissa Alejandra Chávez
**Programa:** TSU en Desarrollo de Software Multiplataforma — UTSLRC
**Versión:** 1.3 · Octubre 2026

Este documento describe cada indicador tal como está implementado en el código del dashboard (hooks, utilidades y Cloud Functions). Cada ficha indica qué mide, cómo se calcula, de dónde salen los datos, con qué frecuencia se actualiza, con qué umbrales se interpreta y qué limitaciones tiene.

> **Nota sobre los umbrales.** Todos los umbrales viven en `src/data/kpiThresholds.js`. Los de eNPS y riesgo psicosocial ya existían en el código desde el inicio; los demás son **valores iniciales propuestos**: no son estándares oficiales, son parametrizables y deben calibrarse con datos reales de la organización.

## Cambios respecto a la v1.1

| Tema | Qué cambió |
|---|---|
| Umbrales | Ya están centralizados en `kpiThresholds.js` y las tarjetas del dashboard leen de ahí (antes eran un pendiente). |
| Desempeño operativo | Al mover una tarea a «Hecho» se guarda `completedAt`; la puntualidad real ya se calcula. Se implementaron los cortes y la muestra mínima (10 tareas, 5 con fecha límite). |
| Participación | El heatmap por departamento ya usa la misma fórmula que el KPI global (promedio semanal). |
| Calidad de datos | Módulo nuevo (`/admin/calidad`) con puntaje ponderado. Se agrega como ficha 4.10. |
| Ausentismo y rotación | Se precisan sus reglas de cálculo, muestras mínimas y limitaciones (fichas 4.6 y 4.7). |
| Sentimiento | Se corrige la descripción: se resume por departamento sobre una muestra reciente, no por semana. |
| Pendientes | Se documentan los resueltos y se actualiza el backlog de calibración y validación del instrumento en la sección 5. |
| Captura y medición | La captura ahora es autenticada y validada en servidor; los seis factores psicosociales del instrumento se preguntan directamente y se elimina la generación de respuestas sintéticas. |

---

## 1. Resumen de indicadores

| KPI | Dimensión | Unidad | Sentido | Fuente | Ventana |
|---|---|---|---|---|---|
| eNPS | Bienestar y clima | −100 a +100 | Mayor es mejor | `responses` | 30 días |
| Presión laboral | Factores psicosociales | 0 a 100 | Mayor es peor | `responses` | 30 días |
| Participación en pulsos | Clima | % | Mayor es mejor | `responses`, headcount | Promedio semanal |
| Seguridad psicológica | Factores psicosociales | 1 a 5 | Mayor es mejor | `responses` | 30 días |
| Riesgo psicosocial por departamento | Factores psicosociales inspirados en ISO 45003 | 1 a 5 y nivel | Mayor es peor | `responses` | 30 días |
| Actividad digital no registrada (proxy) | Presencia en la app | % | Mayor es peor | `presenceSummary` | 30 días |
| Rotación | Rotación | % | Mayor es peor | `departureLog`, headcount | 90 días |
| Ejecución de tareas Kanban (proxy) | Actividad del equipo | % | Mayor es mejor | Tareas de equipos (Kanban) | Acumulado |
| Sentimiento de comentarios | Clima | Positivo / neutral / negativo | Tendencia | `responses.openText`, Gemini | Hasta 120 comentarios recientes |
| Calidad de datos | Calidad de la información | 0 a 100 y nivel | Mayor es mejor | `responses` (más cobertura de `presenceSummary` y `departureLog`) | Hasta 5,000 respuestas de los últimos 12 meses |

## 2. Escala común de niveles

Para que una alerta signifique lo mismo en cualquier tarjeta, todos los KPIs con umbral usan los mismos cuatro niveles del heatmap: **Bajo riesgo**, **Controlado**, **Elevado** y **Crítico**. En el código, cada valor es el límite inferior (inclusive) de su nivel y la función `getKpiLevel()` decide el nivel según el sentido del KPI.

| KPI | Bajo riesgo | Controlado | Elevado | Crítico | Estado |
|---|---|---|---|---|---|
| eNPS | 40 o más (Excelente) | 20 a 39 (Muy bueno) | −10 a 19 (Bueno) | Menor a −10 (Bajo) | Implementado |
| Riesgo psicosocial (1–5) | Menor a 2 | 2 a 2.9 | 3 a 3.9 | 4 o más | Implementado |
| Presión laboral (0–100) | Menor a 25 | 25 a 49 | 50 a 74 | 75 o más | Implementado (valores propuestos) |
| Seguridad psicológica (1–5) | 4.1 o más | 3.1 a 4.0 | 2.1 a 3.0 | 2.0 o menos | Implementado (valores propuestos) |
| Participación (%) | 70 o más | 50 a 69 | 30 a 49 | Menor a 30 | Implementado (valores propuestos) |
| Actividad digital no registrada (proxy, %) | Menor a 5 | 5 a 9.9 | 10 a 14.9 | 15 o más | Implementado (valores propuestos) |
| Rotación 90 días (%) | Menor a 3 | 3 a 4.9 | 5 a 7.9 | 8 o más | Implementado (valores propuestos) |
| Ejecución Kanban: tareas al corriente (%) | 90 o más | 75 a 89 | 50 a 74 | Menor a 50 | Implementado (valores propuestos) |
| Ejecución Kanban: cumplimiento (%) | 60 o más | 40 a 59 | 20 a 39 | Menor a 20 | Implementado (valores propuestos) |
| Calidad de datos (0–100) | 90 o más | 75 a 89 | 50 a 74 | Menor a 50 | Implementado (valores propuestos) |
| Sentimiento | No aplica (se interpreta como tendencia) | | | | — |

**Muestras mínimas** (`MIN_SAMPLE`): 5 respuestas con `instrumentVersion: 2` para mostrar nivel de presión laboral, seguridad psicológica y factores del heatmap; headcount de 5 o más para la rotación; 10 tareas en total y 5 con fecha límite para la ejecución Kanban; 5 respuestas por departamento en el chequeo de calidad. Por debajo del mínimo la tarjeta muestra **Sin datos**.

**Criterios detrás de los valores propuestos**

- **Presión laboral y seguridad psicológica:** derivan de los cortes del heatmap. Un promedio de factores de 2, 3 y 4 equivale a 25, 50 y 75 en la escala de 0 a 100. La seguridad psicológica es un factor protector, así que se invierte (6 − valor): 2.0 o menos coincide con "Crítico". Como se guarda con un decimal, "mayor a 4.0" equivale a "4.1 o más".
- **Participación:** con poca gente respondiendo, todos los demás KPIs pierden representatividad. Menos de 30% debe leerse como "datos poco confiables" además de "poco interés".
- **Actividad digital no registrada:** los niveles se aplican a jornadas sin actividad digital no cubiertas por permiso aprobado. Es un proxy de uso de la plataforma, no de asistencia física.
- **Rotación:** es a 90 días, así que 3% equivale aproximadamente a 12% anual y 8% a cerca de 32%. Son referencias comunes en RH, pero varían por industria y deben ajustarse a la meta de la organización.
- **Desempeño operativo:** se mide con los datos que el Kanban ya guarda (estado, fecha límite y fecha de cierre de cada tarea). El indicador principal es *tareas al corriente*, que es el que muestra la tarjeta del dashboard, y los cortes son exigentes porque una tarea abierta y vencida es una señal clara. El *cumplimiento* es de apoyo y sus cortes son bajos a propósito: el tablero incluye tareas recién creadas, muchas generadas por IA, que empiezan en "Por hacer", y no se espera 100% en un plan de acción vigente.
- **Calidad de datos:** 90 o más significa que el dashboard puede leerse con confianza; por debajo de 50 los números no deberían usarse para decidir.

## 3. Reglas de alerta

Las cinco reglas se evalúan al cargar el dashboard; todas las alertas activas aparecen en la campana del TopBar, respetan las muestras mínimas y se pueden marcar como leídas. El estado de lectura se sincroniza por administrador; no se guarda un historial de alertas.

| # | Regla | Parámetro | Estado |
|---|---|---|---|
| 1 | **Cambio de nivel:** alerta cuando un KPI entra a Elevado o Crítico. | Niveles de `KPI_THRESHOLDS` | Implementado: se muestran todos los niveles activos de salud, operación y departamentos. |
| 2 | **Cambio brusco:** el eNPS cae 10 puntos o más, o la presión laboral sube 10 puntos o más, frente al periodo anterior. | `enpsDrop: 10`, `workPressureRise: 10` | Implementado: eNPS requiere 5 respuestas; presión, 5 respuestas con el instrumento actual en ambos periodos. |
| 3 | **Muestra mínima:** no alertar con menos de 5 respuestas o con un headcount menor a 5. | `MIN_SAMPLE` | Implementado en alertas de respuestas y departamentos; las métricas operativas usan sus propios mínimos. |
| 4 | **Rotación por conteo:** un departamento registra 2 o más bajas en 90 días. | `departuresPerDepartment90d: 2` | Implementado: requiere headcount departamental de al menos 5; las eliminaciones de cuenta no cuentan como rotación. |
| 5 | **Confiabilidad:** si la participación es Crítica (menor a 30%), avisar que los demás indicadores tienen baja representatividad. | Umbral de participación | Implementado: se añade el aviso a la alerta de participación crítica. |

---

## 4. Fichas

### 4.1 eNPS (salud neta del equipo)

- **Qué mide:** disposición de los colaboradores a recomendar la organización como lugar de trabajo.
- **Fórmula:** eNPS = (% promotores − % detractores) × 100, redondeado. Promotores: 9 o 10. Pasivos: 7 u 8. Detractores: 0 a 6.
- **Fuente:** campo `enps` (0 a 10) de `responses`.
- **Frecuencia y ventana:** se recalcula al cargar el dashboard con las respuestas de los últimos 30 días y se compara con los 30 días previos.
- **Umbrales:** Bajo (menor a −10), Bueno (−10 a 19), Muy bueno (20 a 39), Excelente (40 o más).
- **Limitaciones:** la respuesta analítica no incluye UID y el control de completado está separado; los comentarios libres aún pueden contener información identificable. La participación se mide en respuestas, no en personas únicas. Si no hay respuestas en los últimos 30 días, se usa la muestra disponible de los últimos 60 días; no se presenta delta si falta el periodo anterior.

### 4.2 Índice de presión laboral

- **Qué mide:** nivel orientativo de carga y fricción operativa. No es una probabilidad de renuncia ni predice rotación.
- **Fórmula:** promedio de fatiga de turno y carga emocional (escala 1 a 5), convertido con `((promedio − 1) / 4) × 100` y acotado entre 0 y 100.
- **Fuente:** `psychosocialFactors.shiftFatigue` y `psychosocialFactors.emotionalLabor` de respuestas con `instrumentVersion: 2`.
- **Frecuencia y ventana:** 30 días, con comparación contra el periodo anterior.
- **Umbrales:** Bajo riesgo menor a 25; Controlado 25 a 49; Elevado 50 a 74; Crítico 75 o más. A mayor valor, mayor presión. Requiere al menos 5 respuestas con el instrumento actual.
- **Limitaciones:** cada factor se recoge con una pregunta directa, pero el índice y sus umbrales son orientativos y requieren validación con datos de la organización. No es una probabilidad de renuncia. Internamente el campo se llama `attritionRisk` por herencia de una versión anterior; en pantalla y reportes se muestra como presión laboral.

### 4.3 Participación en pulsos

- **Qué mide:** qué proporción de la plantilla responde en una semana típica.
- **Fórmula:** (promedio semanal de respuestas / headcount) × 100, con tope de 100. La misma función (`computeWeeklyParticipation`) se usa en el KPI global y en el heatmap por departamento.
- **Fuente:** `responses` agrupadas por `weekId` y headcount vigente (usuarios activos con rol `employee` o `team_lead`).
- **Frecuencia y ventana:** semanal; el KPI muestra el promedio del periodo.
- **Umbrales:** Bajo riesgo 70 o más; Controlado 50 a 69; Elevado 30 a 49; Crítico menor a 30. A mayor valor, mejor. Solo se asigna nivel si el headcount es mayor a 0.
- **Limitaciones:** cuenta respuestas, no personas. Un departamento sin usuarios asignados tiene headcount 0 y su participación se muestra como 0%.

### 4.4 Índice de seguridad psicológica

- **Qué mide:** confianza para expresarse y opinar sin temor a consecuencias.
- **Fórmula:** promedio de `psychosocialFactors.psychSafety` (escala 1 a 5). Si la pregunta usa un rango mayor que 1–5, se normaliza linealmente del rango configurado a 1–5.
- **Fuente:** `responses`.
- **Frecuencia y ventana:** 30 días, con comparación contra el periodo anterior.
- **Umbrales:** Bajo riesgo 4.1 o más; Controlado 3.1 a 4.0; Elevado 2.1 a 3.0; Crítico 2.0 o menos. A mayor valor, mejor. Requiere al menos 5 respuestas con el instrumento actual.
- **Limitaciones:** si la encuesta no incluye la pregunta, el indicador queda sin datos.

### 4.5 Riesgo psicosocial por departamento (heatmap)

- **Qué mide:** nivel orientativo de riesgo psicosocial por departamento a partir de seis factores preguntados directamente: carga cognitiva, ambigüedad de rol, carga emocional, fatiga de turno, autonomía y seguridad psicológica. Las dimensiones están inspiradas en ISO 45003; el instrumento no está certificado ni validado como evaluación de conformidad con esa norma.
- **Fórmula:** promedio por factor (1 a 5). Autonomía y seguridad psicológica son protectores, así que se invierten (6 − valor) antes de promediar el riesgo total.
- **Fuente:** `psychosocialFactors` de respuestas con `instrumentVersion: 2`, agrupado por `departmentId`.
- **Frecuencia y ventana:** se calcula con las respuestas de los últimos 30 días, igual que los demás KPIs del pulso.
- **Umbrales:** Crítico 4 o más; Elevado 3 a 3.9; Controlado 2 a 2.9; Bajo riesgo menor a 2; "Sin datos" cuando el departamento tiene menos de 5 respuestas recientes con el instrumento actual o no hay factores válidos. Los niveles Elevado y Crítico aparecen entre las alertas activas de la campana del TopBar.
- **Limitaciones:** son autoinformes y no una evaluación normativa o clínica. Los umbrales son propuestos y deben calibrarse con datos reales. Con menos de 5 respuestas recientes no se muestran niveles ni factores.

### 4.6 Actividad digital no registrada (proxy)

- **Qué mide:** proporción de jornadas laborales sin actividad registrada en la aplicación dentro del horario, sin un permiso aprobado que las cubra. Es un proxy de actividad en la plataforma, no una medición de asistencia o ausencia física ni de trabajo realizado fuera de la app.
- **Fórmula:** (días laborales sin actividad ni permiso aprobado / días laborales esperados menos permisos aprobados) × 100. Un día cuenta como presente si hay al menos un evento en `activityLogs` entre la hora de inicio y fin del `workSchedule` (09:00 a 18:00 si no tiene horario definido). Los feriados federales mexicanos no son días esperados.
- **Eventos que cuentan como actividad:** inicio de sesión, navegación dentro de la app (se registra como máximo una vez cada 5 minutos), envío de encuesta y acciones en el Kanban. La hora la pone el servidor (`serverTimestamp`), no el dispositivo.
- **Fuente:** `presenceSummary`, actualizado al llegar actividad en horario y conciliado cada día a las 23:30 (America/Hermosillo) por las Cloud Functions de presencia; `leaveRequests` determina la justificación.
- **Frecuencia y ventana:** cálculo diario; el KPI agrega los últimos 30 días y permite filtrar por departamento. El colaborador puede ver su propio resumen de presencia (transparencia).
- **Umbrales:** Bajo riesgo menor a 5; Controlado 5 a 9.9; Elevado 10 a 14.9; Crítico 15 o más. A mayor valor, peor. Si todavía no hay registros, la tarjeta muestra "Sin datos".
- **Decisión de diseño:** en un entorno presencial la fuente sería un checador (huella o reconocimiento facial). Este prototipo es de trabajo remoto y no usa datos biométricos.
- **Limitaciones:** es un proxy digital; no representa asistencia física, duración o productividad. Vacaciones, permisos e incapacidades solo se consideran cubiertos una vez aprobados. Un solo evento dentro del horario basta para contar el día con actividad; la zona horaria es fija (America/Hermosillo). El dashboard muestra una ventana de 30 días, no una tendencia histórica.

### 4.7 Rotación

- **Qué mide:** proporción de bajas frente a la fuerza laboral del periodo.
- **Fórmula:** bajas / (headcount actual + bajas) × 100, con un decimal.
- **Fuente:** `departureLog`; solo se incluyen desactivaciones (`reason: "deactivated"`). Las eliminaciones (`reason: "deleted"`) se conservan para auditoría pero se excluyen de rotación por considerarse limpieza administrativa.
- **Frecuencia y ventana:** 90 días, comparado con los 90 días previos.
- **Umbrales:** Bajo riesgo menor a 3; Controlado 3 a 4.9; Elevado 5 a 7.9; Crítico 8 o más. A mayor valor, peor. Con un headcount menor a 5 la tarjeta muestra "Sin datos". Se complementa con la regla implementada de 2 o más bajas por departamento en 90 días, con muestra mínima departamental.
- **Limitaciones:** es un proxy de bajas administrativas registradas en la plataforma, no un censo de renuncias. Con plantillas pequeñas, una sola baja mueve el porcentaje varios puntos. El dashboard compara ventanas de 90 días, no mantiene una serie histórica persistida.

### 4.8 Ejecución de tareas Kanban (proxy)

- **Qué mide:** estado y cumplimiento de las tareas creadas en Kanban. Es un proxy de ejecución de planes de acción del equipo, no una medición de desempeño individual ni productividad.
- **Fórmulas:**
  - *Cumplimiento* = tareas completadas / total de tareas × 100.
  - *Tareas al corriente* (en el código, `onTimeRate`) = (tareas con fecha límite − tareas vencidas) / tareas con fecha límite × 100. Una tarea está vencida si no está completada y su fecha límite ya pasó.
  - *Puntualidad* (`punctualityRate`) = de las tareas terminadas que tienen fecha límite y fecha de cierre conocida, el % cerradas a más tardar el día límite.
- **Fuente:** tareas de los equipos del departamento seleccionado (`teams/{teamId}/tasks`); si no hay filtro, se incluyen todos los equipos. La fecha de cierre es `completedAt`, que se guarda al mover una tarea a «Hecho» y se borra si se reabre. Para tareas anteriores a ese campo se toma el último movimiento a «Hecho» del historial de la tarea.
- **Frecuencia y ventana:** acumulado a la fecha de consulta. La tarjeta muestra la puntualidad en su detalle junto con el número de tareas terminadas que tienen fecha límite y fecha de cierre medible.
- **Umbrales:**
  - *Tareas al corriente* (indicador principal, el que muestra la tarjeta): Bajo riesgo 90 o más; Controlado 75 a 89; Elevado 50 a 74; Crítico menor a 50.
  - *Cumplimiento* (indicador de apoyo): Bajo riesgo 60 o más; Controlado 40 a 59; Elevado 20 a 39; Crítico menor a 20.
  - A mayor valor, mejor. El nivel de la tarjeta se toma de *tareas al corriente*.
  - **Muestra mínima:** al menos 10 tareas en total y 5 con fecha límite; si no se alcanza, la tarjeta muestra "Sin datos" en lugar de un nivel.
- **Limitaciones:** depende de que los equipos registren tareas y fechas límite; las tareas sin fecha límite no entran en "al corriente". Una tarea terminada con retraso cuenta como al corriente si ya no está abierta; ese indicador mide "sin atraso pendiente", no puntualidad histórica. La puntualidad solo se calcula para tareas cerradas con fecha límite conocida. El dashboard usa el estado acumulado y no conserva una serie histórica de este proxy.

### 4.9 Sentimiento de comentarios

- **Qué mide:** tono de los comentarios abiertos de las encuestas.
- **Fórmula:** cada comentario se clasifica como positivo, neutral o negativo con Gemini (Cloud Function `classify_sentiment`). Por departamento se calcula el balance neto = (% positivos − % negativos) × 100 sobre la muestra. Además se listan los 3 comentarios negativos más recientes como focos de fricción.
- **Fuente:** `responses.openText` (solo respuestas con comentario).
- **Frecuencia y ventana:** se evalúan hasta 120 comentarios recientes con texto. La clasificación se guarda por respuesta junto con un hash del texto; se reutiliza mientras el comentario no cambie. El resultado se agrupa por departamento y no representa una tendencia semanal.
- **Umbrales:** no aplica; se interpreta como tendencia.
- **Limitaciones:** si el modelo no devuelve un resultado válido, los comentarios se marcan como neutrales por defecto, lo que puede sesgar el resultado. La clasificación se repite en cada carga, lo que consume cuota de la API. Los comentarios se envían al modelo sin identificar a la persona, pero su texto puede contener datos personales.

### 4.10 Calidad de datos

- **Qué mide:** qué tan confiable es el conjunto de respuestas con el que se calculan los KPIs. Es un módulo de solo lectura (`/admin/calidad`): evalúa, explica y sugiere cómo corregir, pero no modifica ni elimina datos.
- **Fórmula:** puntaje = suma(peso × resultado de cada chequeo) / suma(pesos de los chequeos con resultado) × 100, redondeado. Cada chequeo da un resultado entre 0 y 1; es "ok" desde 0.95, "atención" desde 0.75 y "falla" por debajo.

| Chequeo | Peso | Qué verifica | Resultado |
|---|---|---|---|
| Completitud | 25 | Que cada respuesta tenga departamento, semana válida (`AAAA-Wnn`), fecha de envío y eNPS. | 1 − incompletas / total |
| Rangos y referencias | 25 | eNPS de 0 a 10, balance vida-trabajo de 1 a 10, factores de 1 a 5, y que el departamento exista en el catálogo. | 1 − fuera de rango / total |
| Muestra mínima | 20 | Que cada departamento activo tenga al menos 5 respuestas en los últimos 30 días (usa hasta 12 meses de datos recientes si no hay respuestas en esa ventana). | Departamentos que cumplen / departamentos activos |
| Posibles duplicados | 15 | Respuestas idénticas del mismo departamento enviadas con menos de 1 minuto de diferencia. | 1 − duplicados / total |
| Frescura | 15 | Días desde la última respuesta: hasta 7 es correcto, hasta 14 atención. | 1, 0.5 o 0 |
| Instrumento de captura | 0 (informativo) | Porcentaje de respuestas que conservan su plantilla. | Proporción con plantilla |
| Cobertura de fuentes | 0 (informativo) | Si hay registros de presencia en 30 días y headcount de al menos 5 para la rotación. | 1 o 0.5 |

- **Frecuencia y ventana:** se evalúa al abrir la página o al recargar sobre hasta 5,000 respuestas de los últimos 12 meses. Los registros históricos marcados como sintéticos se excluyen; ya no existe un filtro por origen.
- **Umbrales (propuestos):** Bajo riesgo 90 o más; Controlado 75 a 89; Elevado 50 a 74; Crítico menor a 50. Sin respuestas, "Sin datos".
- **Limitaciones:** solo valida la colección `responses`; presencia y bajas se revisan únicamente por cobertura. Los documentos no contienen UID, por lo que los duplicados se reportan como "posibles"; el texto libre puede incluir información identificable. Sin respuestas con fecha, la frescura se califica 0.

---

### 4.11 Permisos y asistencia digital

- **Solicitudes:** los colaboradores piden vacaciones, incapacidad u otro permiso desde Mi Espacio. Cada solicitud incluye periodo, días hábiles, motivo y estado; solo RH puede aprobar o rechazar y quien la creó puede cancelar mientras esté pendiente.
- **Días hábiles:** lunes a viernes, excluyendo los días de descanso obligatorio federales de México con fecha fija o móvil contemplados por la regla. No incluye calendarios estatales, el día electoral variable ni días adicionales definidos por la empresa.
- **Saldo de vacaciones:** días anuales según años completos de antigüedad (12 días al cumplir el primer año, con progresión legal hasta 20 durante los primeros cinco años y aumentos posteriores); descuenta días aprobados y reservados por solicitudes pendientes del periodo de aniversario actual. Se calcula con `hireDate`.
- **Actividad en horario:** se reutiliza `activityLogs`; no se marca entrada o salida manual ni se infieren horas trabajadas. Una jornada sin eventos se muestra como sin actividad digital registrada; un permiso aprobado se indica por separado. Esto no determina asistencia física ni que la persona no trabajó fuera de la aplicación.
- **Perfil del colaborador:** cada persona puede editar su nombre visible y teléfono y subir una foto JPG, PNG o WebP de hasta 5 MB. La administración conserva el control de identificador, puesto, tipo de contratación, fecha de ingreso, rol, departamento y horario.
- **Fotos en equipos:** los comentarios Kanban muestran la foto del perfil público del autor, o sus iniciales si no hay foto.

## 5. Pendientes de consistencia

### 5.1 Resueltos

| Pendiente anterior | Cómo quedó |
|---|---|
| Participación calculada distinto en KPI global y heatmap | Ambos usan `computeWeeklyParticipation`. |
| Faltaban umbrales en el código | Centralizados en `src/data/kpiThresholds.js`; las tarjetas del dashboard y el chip de nivel leen de ahí. |
| Umbrales de desempeño sin implementar | Implementados, junto con la muestra mínima de tareas. |
| No se guardaba la fecha de cierre de tareas | Se guarda `completedAt` al pasar a «Hecho» y se calcula la puntualidad real. |
| El heatmap usaba todo el histórico y no aplicaba muestra mínima | Usa respuestas de los últimos 30 días y muestra "Sin datos" por departamento con menos de `MIN_SAMPLE.responses` (5) respuestas. |
| La puntualidad no se mostraba y el desempeño ignoraba el filtro de departamento | La puntualidad aparece en el detalle de la tarjeta y las tareas se filtran por el departamento seleccionado. |
| Modelo de Gemini distinto entre documentos y código | README, PRD y `functions/main.py` usan el mismo nombre de modelo. Confirma que ese modelo esté disponible en tu cuenta de Google AI Studio. |
| No existía validación de la calidad de los datos | Módulo `/admin/calidad` (ficha 4.10). |
| Los KPIs no distinguían el respaldo histórico y comparaciones sin periodo previo | Se etiqueta "Histórico" cuando no hay respuestas recientes y se muestra "Sin periodo previo" cuando no existe base de comparación. |
| La encuesta derivaba algunos factores psicosociales con reglas fijas | El instrumento pregunta directamente por los seis factores; se eliminaron las asignaciones de valores sintéticos. |
| Las respuestas sintéticas contaminaban los KPIs al presentar datos reales | Se retiraron el generador de datos sintéticos y los filtros de origen; cualquier registro histórico marcado como sintético se excluye de analítica. |
| Las reglas de alerta estaban incompletas y solo se mostraba un departamento crítico | Las cinco reglas se evalúan con muestras mínimas; todas aparecen en la campana del TopBar y el estado de lectura se sincroniza por administrador. |
| Los niveles psicosociales estaban duplicados y faltaban niveles en los reportes | El heatmap, la leyenda y la clasificación usan `KPI_THRESHOLDS`; PDF y Excel exportan valor y nivel. |
| Las eliminaciones de cuentas de prueba aumentaban la rotación | Se excluyen del cálculo los eventos `reason: "deleted"`; las desactivaciones explícitas se mantienen. |
| El análisis de sentimiento se repetía y su nombre sugería agrupación semanal | Se cachea por hash de comentario y la tarjeta ahora se denomina "Sentimiento por departamento". |
| La documentación no coincidía con los roles, scripts y métricas implementados | README, MVP y PRD actualizados según las rutas, datos y cálculos actuales. |

### 5.2 Vigentes

- Calibrar preguntas, umbrales y muestras mínimas con la organización; los factores son autoinformes orientativos inspirados en ISO 45003, no un instrumento validado ni una certificación.
- Los indicadores de actividad digital y Kanban son proxies; en el Dashboard Ejecutivo solo las métricas de encuesta tienen serie semanal. `/admin/asistencia` muestra su resumen mensual de actividad digital, mientras que las demás tarjetas operativas son agregados por ventana o estado actual.

## 6. Configuración de umbrales

Los umbrales se editan en un solo archivo, sin tocar las tarjetas. Esta es la estructura que usa el código:

```js
// src/data/kpiThresholds.js
export const KPI_THRESHOLDS = {
  psychosocialRisk: { direction: "higher-is-worse",  from: { controlled: 2, elevated: 3, critical: 4 } },
  enps:             { direction: "higher-is-better", from: { low: 40, controlled: 20, elevated: -10 } },
  workPressure:     { direction: "higher-is-worse",  from: { controlled: 25, elevated: 50, critical: 75 } },
  digitalAbsence:   { direction: "higher-is-worse",  from: { controlled: 5, elevated: 10, critical: 15 } },
  turnover90d:      { direction: "higher-is-worse",  from: { controlled: 3, elevated: 5, critical: 8 } },
  psychSafety:      { direction: "higher-is-better", from: { low: 4.1, controlled: 3.1, elevated: 2.1 } },
  participation:    { direction: "higher-is-better", from: { low: 70, controlled: 50, elevated: 30 } },
  taskOnTrack:      { direction: "higher-is-better", from: { low: 90, controlled: 75, elevated: 50 } },
  taskCompletion:   { direction: "higher-is-better", from: { low: 60, controlled: 40, elevated: 20 } },
};

export const MIN_SAMPLE = { responses: 5, headcount: 5, tasks: { total: 10, withDueDate: 5 } };
export const ALERT_RULES = { enpsDrop: 10, workPressureRise: 10, departuresPerDepartment90d: 2 };
```

- En los KPIs donde **mayor es peor**, cada valor es el límite inferior del nivel indicado; por debajo de `controlled` es Bajo riesgo.
- En los KPIs donde **mayor es mejor**, cada valor es el límite inferior del nivel indicado; por debajo de `elevated` es Crítico.
- `getKpiLevel(clave, valor)` devuelve el nivel, y `getKpiLevelForSample()` devuelve "Sin datos" si la muestra es menor al mínimo.
- Los umbrales de calidad de datos y sus pesos están aparte, en `src/data/dataQualityRules.js` (`QUALITY_WEIGHTS`, `QUALITY_LEVEL_FROM`, `FRESHNESS_DAYS`).
