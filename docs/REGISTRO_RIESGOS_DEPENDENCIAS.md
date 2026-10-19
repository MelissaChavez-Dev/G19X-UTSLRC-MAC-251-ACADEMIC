# Registro de riesgos de dependencias

## Revisión del 19 de octubre de 2026

Se ejecutó `npm audit --omit=dev`. La auditoría reportó **6 paquetes con avisos de severidad alta y ninguno crítico** en las dependencias de producción. Este registro describe en particular el riesgo de `xlsx`; no significa que los otros avisos de la auditoría estén resueltos.

| Paquete | Versión instalada | Avisos detectados | Estado de corrección |
|---|---:|---|---|
| `xlsx` (SheetJS) | `0.18.5` | Alto: Prototype Pollution (`GHSA-4r6h-8v6p-xvw6`, versiones `<0.19.3`) y ReDoS (`GHSA-5pgg-2g8v-p4x9`, versiones `<0.20.2`). | `npm audit` indicó `fixAvailable: false` para este paquete en la revisión. |

## Alcance y evaluación

El uso actual está limitado a **crear y exportar** libros desde objetos construidos por la aplicación (`book_new`, `json_to_sheet`, `book_append_sheet`, `writeFile`) en `src/services/excelExportService.js`. No se encontró una ruta que lea o analice libros Excel proporcionados por usuarios. Por ello, la exposición a los avisos relacionados con la lectura de archivos no confiables es menor que en una función de importación, pero el riesgo de la dependencia no se considera eliminado.

## Mitigaciones y seguimiento

- No agregar importación ni lectura de archivos Excel externos con la versión actual.
- Mantener `package-lock.json` versionado y volver a ejecutar `npm audit --omit=dev` antes de publicar cambios.
- Revisar avisos y versiones disponibles antes de cada entrega; no aplicar un downgrade mayor automático del SDK de Firebase como solución indirecta de auditoría.
- Evaluar una migración a ExcelJS o a una versión corregida de SheetJS con pruebas de equivalencia de hojas, celdas, acentos, fórmulas y nombres de archivo.
- El resto de los avisos de alta severidad que reportó `npm audit` (familia Firebase y `source-map-js`) requieren seguimiento separado; esta decisión sobre `xlsx` no los mitiga.
