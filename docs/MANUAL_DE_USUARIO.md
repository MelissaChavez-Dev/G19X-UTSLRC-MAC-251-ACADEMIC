# Manual de usuario y primer uso

## 1. Alcance

La plataforma tiene dos perfiles: `admin` (administración/RH) y `employee` (colaborador). No hay registro público. El sistema muestra indicadores agregados de salud organizacional y actividad digital; esta última es un proxy de uso de la aplicación, no una medición de asistencia física, horas trabajadas ni productividad individual.

## 2. Preparación de la primera cuenta administradora

La primera cuenta debe autorizarla y crearla la persona responsable del proyecto:

1. En Firebase Console, abre **Authentication** y agrega una cuenta con correo y contraseña. No compartas la contraseña por el repositorio ni la incluyas en capturas.
2. Inicia sesión en la aplicación con esa cuenta. Si no tiene rol, la aplicación intenta ejecutar `bootstrap_admin`.
3. La función otorga el rol `admin` solo cuando todavía no existe un perfil con ese rol en Firestore. La cuenta inicial queda activa y el navegador actualiza sus claims para abrir el dashboard.
4. Si ya existe un administrador, `bootstrap_admin` no asigna otro. El admin existente debe dar de alta las demás cuentas desde **Gestión de Usuarios**.

El bootstrap no sustituye la autorización de la cuenta inicial: el responsable del proyecto debe controlar quién puede iniciar sesión en esa primera cuenta. Las credenciales de acceso se distribuyen por un medio privado.

## 3. Departamentos y colaboradores

1. Con sesión de administrador, abre **Gestión de Usuarios** (`/admin/usuarios`).
2. En la sección **Departamentos**, escribe el nombre y agrégalo. La aplicación crea un documento en `departments` con un ID derivado del nombre; el departamento queda disponible para cuentas y encuestas.
3. Usa las acciones de la sección para renombrar o desactivar un departamento. Desactivarlo conserva el historial y evita asignaciones nuevas.
4. Crea cada cuenta de colaborador desde el formulario de alta: nombre, correo, rol, departamento y datos laborales necesarios.
5. Entrega la contraseña temporal de forma privada. La persona tendrá que cambiarla en su primer acceso. No reutilices contraseñas ni publiques la contraseña en un ticket o reporte.

La colección `departments` se administra desde la aplicación; no se necesita importar un archivo para empezar. Las reglas permiten escribir allí únicamente a un admin.

## 4. Acceso y navegación

- **Admin:** dashboard ejecutivo, usuarios/departamentos, encuestas, permisos, equipos, calidad de datos y actividad digital.
- **Employee:** espacio personal, encuestas asignadas, solicitudes de permisos y equipos a los que pertenece.
- Al iniciar sesión con una contraseña temporal, completa primero el cambio solicitado.
- Si una cuenta aún no fue aprovisionada, aparecerá el aviso para pedir el alta a la administración.

Para el despliegue de evaluación, utiliza el archivo privado `CREDENCIALES DE ACCESO.md`. Es distinto de `KEYS.txt`, que contiene los valores de configuración de Firebase y se referencia desde `.env.example`; ambos se entregan por separado y no deben subirse al repositorio.

## 5. Tareas frecuentes

### Dashboard y reportes

El admin puede filtrar los indicadores por departamento y periodo, abrir el detalle de un indicador y exportar reportes PDF o Excel. Revisa el tamaño de muestra y las alertas de calidad antes de interpretar resultados; los indicadores no sustituyen una evaluación clínica ni una evaluación de conformidad con ISO 45003.

### Encuestas

El admin crea y publica plantillas, define periodicidad y departamentos destino. Los colaboradores responden desde su espacio personal. Una respuesta válida se registra de forma desidentificada para analítica y el sistema evita una segunda respuesta para el mismo ciclo.

### Permisos

El colaborador solicita vacaciones, incapacidad u otro permiso desde su espacio personal y puede cancelar solicitudes pendientes. Para incapacidad, adjunta un comprobante PDF/JPG/PNG dentro del límite que muestra la aplicación. El admin revisa, aprueba o rechaza; los rechazos requieren un motivo de 10 a 500 caracteres.

### Equipos y Kanban

El admin crea proyectos y distribuye el código de invitación. Los integrantes pueden usar el tablero, gestionar tareas y listas y participar en comentarios según los permisos de la aplicación. La presencia digital resume eventos de uso permitidos y no mide presencia física.

## 6. Archivos de configuración y credenciales

- `.env.example`: plantilla pública con nombres de variables; cópiala a `.env.local` para configurar un proyecto propio.
- `KEYS.txt`: archivo de configuración sensible entregado por separado; no es la plantilla ni el documento de acceso.
- `CREDENCIALES DE ACCESO.md`: cuentas de prueba/evaluación entregadas en otra carpeta privada; no contiene claves de Firebase.

No publiques valores reales de `.env.local`, archivos de claves de servicio ni contraseñas.

## 7. Ayuda y solución de problemas

| Situación | Acción |
|---|---|
| La cuenta no tiene acceso | Solicita al admin que revise el rol, el estado de la cuenta y su perfil de usuario. |
| No aparecen departamentos | Pide a un admin que cree y active los departamentos en Gestión de Usuarios. |
| La encuesta no está disponible | Verifica que la plantilla esté publicada, que el departamento esté asignado y que el ciclo siga abierto. |
| No se puede adjuntar un comprobante | Confirma el formato y tamaño aceptados por el formulario y vuelve a intentar con una conexión estable. |
| La exportación falla | Reintenta y reporta al responsable de soporte el módulo, el momento y el mensaje visible; no adjuntes datos personales. |

El procedimiento operativo y la periodicidad de revisión están en [`PLAN_MANTENIMIENTO_Y_SOPORTE.md`](PLAN_MANTENIMIENTO_Y_SOPORTE.md).
