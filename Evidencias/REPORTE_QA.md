# Reporte de aseguramiento de calidad

**Proyecto:** Dashboard Ejecutivo y Plataforma de Salud Organizacional  
**Fecha de ejecución:** 19 de octubre de 2026  
**Alcance:** pruebas automatizadas del repositorio y compilación local. No se validó un despliegue productivo ni se usaron cuentas reales en estas pruebas. `Evidencias/` contiene 29 capturas PNG de la demostración de interfaz.

## Resultados

| Validación | Comando | Resultado |
|---|---|---|
| Pruebas frontend | `npm test` | **Aprobado:** 30 pruebas, 30 pasaron. |
| Pruebas Python de Cloud Functions | `functions\venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py"` | **Aprobado:** 15 pruebas, 15 pasaron. |
| Sintaxis de Cloud Functions | `functions\venv\Scripts\python.exe -m py_compile functions\main.py functions\common.py functions\accounts.py functions\surveys.py functions\permissions.py functions\teams.py functions\presence.py` | **Aprobado:** módulos compilados sin errores de sintaxis. |
| Reglas de Firestore | `npm run test:rules` | **Aprobado:** 9 pruebas en el emulador, 9 pasaron. Incluye rechazo sin motivo o con menos de 10 caracteres, validación de actividad y esquema de tareas. |
| Lint de métricas y pruebas | `npx eslint src\utils\metricUtils.js src\utils\departmentRiskUtils.js src\hooks\useOrgHealthMetrics.js src\hooks\useDepartmentRisk.js src\hooks\useFrictionSources.js src\hooks\useWeeklySentiment.js src\hooks\useWeeklyTrends.js src\hooks\useDataQuality.js src\services\responseService.js src\services\surveyService.js tests\metricUtils.test.js tests\departmentRiskUtils.test.js` | **Aprobado:** sin errores. |
| Build frontend | `npm run build` | **Aprobado:** Vite completó la compilación de producción. |

Los mensajes `PERMISSION_DENIED` que aparecen en la salida del emulador corresponden a solicitudes inválidas que las pruebas comprueban que las reglas rechacen; no son fallos del conjunto.

## Cobertura y limitaciones

- Se probaron utilidades de encuestas, métricas, permisos y evaluación de riesgo en el conjunto frontend.
- Las pruebas Python cubrieron validación de entradas de IA, autenticación administrativa y lógica de envío de encuestas.
- Las pruebas de reglas comprobaron permisos de lectura/escritura de colecciones y escenarios negativos para notas de rechazo, eventos de actividad y tareas.
- Se añadieron pruebas para permisos aprobados sin resumen diario, distinción entre actividad, jornada en curso, ausencia confirmada y resumen faltante, y compatibilidad con horarios heredados.
- El build y las pruebas no equivalen a una prueba de aceptación visual ni a una verificación de servicios desplegados.
- Las 29 capturas PNG documentan pantallas y flujos de la demostración; no son pruebas automatizadas ni validan el estado actual del despliegue.
- Los valores visibles corresponden a perfiles ficticios y respuestas ingresadas manualmente por cinco personas de apoyo. No son resultados representativos de la población organizacional.

## Criterio de aceptación

Para esta ejecución local se considera aprobado el conjunto automatizado porque todos los comandos indicados terminaron correctamente. Antes de una publicación, ejecutar nuevamente estas validaciones contra el cambio candidato y realizar la verificación posterior al despliegue conforme al [Plan de mantenimiento y soporte](../docs/PLAN_MANTENIMIENTO_Y_SOPORTE.md).
