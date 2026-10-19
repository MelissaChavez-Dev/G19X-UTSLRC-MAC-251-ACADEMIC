# Plan de trabajo

## 1. Objetivo

Organizar la entrega técnica y la puesta en operación del Dashboard Ejecutivo y la Plataforma de Salud Organizacional, con énfasis en módulos funcionales, seguridad, pruebas, documentación y soporte. Este plan describe una secuencia verificable; no atribuye fechas ni resultados históricos que no estén registrados.

## 2. Fases y entregables

| Fase | Actividades | Entregable / criterio de salida |
|---|---|---|
| 1. Alcance y requisitos | Confirmar roles, necesidades de dirección/RH y colaboradores, indicadores, privacidad y restricciones. | PRD y alcance del MVP revisados por el responsable de producto. |
| 2. Diseño y arquitectura | Definir navegación, componentes, modelo de datos, servicios y límites de acceso. | Prototipo/arquitectura documentados y modelo de datos coherente con el producto. |
| 3. Construcción frontend | Implementar dashboard, encuestas, perfiles, permisos, equipos/Kanban, exportaciones y estados de carga/error. | Flujos de admin y employee navegables y conectados a Firebase. |
| 4. Backend y datos | Implementar Cloud Functions, bootstrap, validaciones, métricas, presencia y reglas de Firestore/Storage. | Operaciones sensibles mediadas por backend; reglas deniegan acceso no autorizado. |
| 5. Validación QA | Ejecutar pruebas unitarias, pruebas de reglas, compilación y recorridos manuales con cuentas de prueba. Registrar fallos y repetir tras corregir. | Reporte QA con comandos, resultados, limitaciones y evidencia real, sin datos sensibles. |
| 6. Documentación y soporte | Preparar manual, instrucciones de primer uso, plan de trabajo, mantenimiento y soporte. | Documentación revisada y responsables/canal institucional definidos antes de producción. |
| 7. Despliegue y seguimiento | Configurar entorno, desplegar a proyecto autorizado, verificar flujos y observar logs/cuotas. | Versión identificada, verificación posterior al despliegue y seguimiento de incidencias. |

## 3. Orden recomendado de ejecución

1. Acordar entorno Firebase, responsables de operación y política de datos.
2. Crear el primer admin con el procedimiento de [`MANUAL_DE_USUARIO.md`](MANUAL_DE_USUARIO.md), y desde su sesión configurar departamentos y cuentas.
3. Ejecutar primero pruebas automatizadas y revisión de reglas en emulador; corregir cualquier fallo antes de desplegar.
4. Verificar los flujos principales con cuentas de prueba: acceso/roles, encuestas, permisos, Kanban, métricas y exportación.
5. Desplegar y comprobar logs, programación de presencia y límites de servicios.
6. Cerrar la entrega con el reporte QA, la guía de uso, el plan de soporte y las capturas tomadas durante una ejecución real.

## 4. Seguimiento y aceptación

Mantener por cada cambio una tarea con responsable, estado, dependencias, pruebas, resultado y riesgo. No marcar un entregable como aceptado hasta que exista evidencia reproducible y revisión del responsable. Si una fase se bloquea por configuración, datos o permisos externos, registrar el bloqueo y su dependencia en vez de reportarla como completada.

Los criterios de calidad incluyen: acceso conforme a roles, validación en backend/reglas para operaciones de escritura, ausencia de secretos versionados, pruebas aplicables ejecutadas y documentación coherente con las dependencias y comportamiento reales.
