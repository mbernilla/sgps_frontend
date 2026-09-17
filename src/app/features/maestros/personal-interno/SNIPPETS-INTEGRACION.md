# Snippets de Integración - Personal Interno

## 1. Agregar Ruta en `src/app/app.routes.ts`

Localiza la sección de Maestros (alrededor de la línea 66-86) y agrega esta ruta dentro del array `children`:

```typescript
{
  path: 'maestros/personal-interno',
  loadComponent: () => import('./features/maestros/personal-interno/personal-interno.component').then(m => m.PersonalInternoComponent),
},
```

**Ubicación exacta:** Después de la ruta `maestros/contratos-slas` (línea 84-86)

---

## 2. Agregar Elemento al Menú Sidebar en `src/app/layout/layout.html`

Localiza la sección donde está el elemento "SLAs" (línea 91-99) y agrega después:

```html
<a routerLink="/maestros/personal-interno" routerLinkActive="bg-slate-700 text-white"
   class="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors duration-150 cursor-pointer group"
   [title]="isSidebarCollapsed() ? 'Personal Interno' : ''">
  <i class="pi pi-users text-lg min-w-5 text-center group-hover:text-blue-400"></i>
  <div class="menu-text-container transition-opacity duration-300"
       [ngClass]="isSidebarCollapsed() ? 'opacity-0 w-0' : 'opacity-100'">
    <span class="text-sm font-medium">Personal Interno</span>
  </div>
</a>
```

**Ubicación exacta:** Después del elemento "SLAs" (después de la línea 99)

---

## 3. Agregar Ruta Segura en `src/app/layout/layout.ts` (Opcional pero Recomendado)

Localiza el array `rutasPadreSeguras` (alrededor de la línea 129-137) y agrega la nueva ruta:

```typescript
const rutasPadreSeguras = [
  '/requerimientos',
  '/informes',
  '/conciliaciones/maestro',
  '/maestros/sistemas',
  '/maestros/catalogo-entregables',
  '/maestros/contratos-slas',
  '/maestros/personal-interno',  // ← AGREGAR ESTA LÍNEA
  '/admin/contratos'
];
```

**Por qué:** Esto evita que el usuario sea redirigido a otra pantalla cuando cambia el contrato mientras navega en Personal Interno.

---

## 4. Verificar el Código del Catálogo de Equipos ⚠️

El componente carga equipos vía `MaestraService.getConceptos('EQP_GRP')`.

**IMPORTANTE:** Reemplaza `'EQP_GRP'` con el código correcto que use tu backend para los equipos.

Busca en otros componentes qué patrones se usan (ej: `'GRP_TEC'`, `'TIP_EMP'`, etc.) y ajusta en:

**Archivo:** `personal-interno.component.ts` línea ~101
```typescript
// DESPUÉS (ajusta con el código real si es diferente):
this.maestra.getConceptos('EQP_GRP').subscribe({  // ← Cambia si es necesario
  next: equipos => this.equipos.set(equipos),
  error: () => this.toast('error', 'Error', 'No se pudieron cargar los equipos.'),
});
```

Contacta con el equipo backend si no sabes el código exacto del catálogo de equipos.

---

## Resumen

✅ Archivos creados:
- `personal-interno.model.ts` — DTOs
- `personal-interno.service.ts` — Servicio HTTP
- `personal-interno.component.ts` — Lógica principal
- `personal-interno.component.html` — Template ZEN
- `personal-interno.component.scss` — Estilos (vacío, todo Tailwind)

✅ Pasos de integración:
1. Copiar snippet de ruta a `app.routes.ts`
2. Copiar snippet de menú a `layout.html`
3. (Opcional) Copiar ruta segura a `layout.ts`
4. ⚠️ **IMPORTANTE:** Verificar y ajustar el código del catálogo de equipos en `personal-interno.component.ts` (línea ~101)

---

El CRUD está listo para usar con:
- Tabla con búsqueda por DNI, nombre, correo, equipo, rol
- Modal con validación de campos
- Confirmación de eliminación con `ActionOrchestratorService`
- Toasts de éxito/error
- Diseño ZEN completo con Tailwind CSS
