# Plan de mantenimiento y soporte

## 1. Propósito y alcance

Este plan establece una operación básica para el frontend React/Vite, Cloud Functions, Firebase Authentication, Firestore, Storage y sus reglas. No sustituye los acuerdos de nivel de servicio de Firebase ni autoriza el uso de datos personales fuera de la finalidad del sistema.

## 2. Responsables

| Rol operativo | Responsabilidades |
|---|---|
| Responsable de producto / organización | Autorizar accesos, departamentos, cuentas admin y prioridades de cambios. |
| Responsable técnico | Mantener el repositorio, dependencias, Functions, reglas, configuración y despliegues; atender incidentes técnicos. |
| Administración / RH | Gestionar departamentos, usuarios, permisos, encuestas y revisión de calidad de datos. |
| Colaboradores | Proteger sus credenciales, reportar problemas y usar los módulos conforme a su propósito. |

En una instalación académica o de demostración una persona puede cubrir más de un rol. Antes de producción, asigna nombres y un canal de contacto institucional, y limita el acceso administrativo al mínimo necesario.

## 3. Rutina de mantenimiento

| Frecuencia recomendada | Actividades |
|---|---|
| En cada cambio | Revisar el alcance, ejecutar pruebas pertinentes, comprobar build, revisar las reglas y documentar el resultado antes de desplegar. |
| Semanal | Revisar errores de Functions, fallos de autenticación, capacidad de cuotas y reportes de usuarios; confirmar que las tareas programadas se ejecutaron. |
| Mensual | Revisar cuentas admin activas, cuentas sin uso, departamentos activos, permisos de acceso y alertas de calidad; comprobar que los índices requeridos están desplegados. |
| Trimestral | Revisar dependencias y avisos de seguridad, probar el procedimiento de recuperación y validar copias de seguridad/exportaciones bajo las políticas de retención aplicables. |
| Ante un incidente | Contener el riesgo, preservar registros técnicos necesarios, limitar datos personales, restaurar el servicio y registrar causa y acciones correctivas. |

La frecuencia puede ajustarse al volumen y al entorno, pero los cambios a reglas o permisos deben probarse antes de desplegarlos.

## 4. Cambios y despliegues

1. Trabajar en una rama de cambio y no modificar producción directamente.
2. Ejecutar `npm test`, `npm run build` y `python -m unittest discover -s tests -p "test_*.py"`; para reglas, ejecutar `npm run test:rules` con Firebase CLI y Java disponibles.
3. Revisar las diferencias de `firestore.rules`, `storage.rules`, `firebase.json` e índices en especial, y verificar que no se incluyen secretos ni `.env.local`.
4. Desplegar primero en un proyecto de prueba/emulador y luego al proyecto autorizado. El despliegue propio de Functions requiere la versión de Python indicada por `firebase.json`, Firebase CLI y los secretos configurados en el gestor de Firebase.
5. Tras desplegar, comprobar acceso de admin y empleado, lectura de datos, una operación representativa por módulo y logs de Functions.
6. Registrar versión, fecha, cambios, pruebas y resultado. Ante regresión, detener el despliegue y restaurar la versión estable o aplicar una corrección aprobada.

## 5. Respaldo y recuperación

- Configurar y verificar respaldos/exportaciones de Firestore y Storage en el proyecto de Firebase conforme a la retención y presupuesto acordados.
- Mantener la configuración de despliegue y el código fuente en Git; excluir secretos, exportaciones con datos personales y credenciales.
- Restringir el acceso a copias y verificar su integridad periódicamente mediante una restauración de prueba en un proyecto aislado.
- Antes de restaurar producción, aprobar el alcance y la fecha de recuperación con la organización; registrar pérdida potencial de cambios posteriores al respaldo.
- Rotar credenciales si hay exposición y revisar registros de acceso. No almacenar llaves de servicio en el repositorio.

Los respaldos y la retención de información deben respetar la política de privacidad de la organización y las capacidades/condiciones vigentes del proyecto Firebase.

## 6. Atención de incidentes

1. Registrar fecha, módulo, entorno, impacto, pasos de reproducción y mensaje técnico sin contraseñas ni información personal innecesaria.
2. Clasificar prioridad:
   - **Crítica:** indisponibilidad general, acceso no autorizado o exposición de datos. Contener y escalar inmediatamente al responsable técnico y de la organización.
   - **Alta:** módulo central degradado o riesgo de pérdida/integridad de datos. Priorizar mitigación y seguimiento el mismo día hábil.
   - **Media:** fallo con alternativa manual o afectación parcial. Programar corrección prioritaria.
   - **Baja:** consulta o mejora sin impacto operativo. Registrar en backlog.
3. Mitigar sin borrar evidencias relevantes; preservar logs técnicos con acceso restringido.
4. Comunicar estado, alternativa temporal y siguiente actualización por el canal institucional que designe la organización.
5. Cerrar con causa, solución, validación y acción preventiva. No incluir credenciales ni respuestas identificables en el reporte.

Este plan no define tiempos de respuesta contractuales. La organización debe designar el canal y responsables de soporte antes de operar con usuarios reales.

## 7. Privacidad y límites funcionales

Las encuestas analíticas están diseñadas para desidentificarse; los controles operativos conservan datos necesarios para unicidad y permisos. La actividad digital es un proxy de eventos en la plataforma, no una medición de asistencia física, tiempo efectivo ni productividad. No usar los indicadores como evaluación individual automatizada. La guía de operación del usuario está en [`MANUAL_DE_USUARIO.md`](MANUAL_DE_USUARIO.md).
