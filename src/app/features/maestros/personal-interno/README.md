# CRUD Personal Interno - Módulo Completo

## 📋 Descripción

Módulo CRUD (Create, Read, Update, Delete) para administrar el Personal Interno del sistema SGPS.

**Características principales:**
- ✅ Tabla responsiva con columnas: DNI, Nombres, Correo, Equipo, Rol, Acciones
- ✅ Búsqueda y filtrado en tiempo real (mediante computed signals)
- ✅ Modal de creación y edición con validación reactiva
- ✅ Confirmación de eliminación con `ActionOrchestratorService`
- ✅ Notificaciones toast (éxito/error)
- ✅ Diseño ZEN completo con Tailwind CSS
- ✅ Estado reactivo con Signals y Computed
- ✅ Formularios reactivos con validaciones

---

## 📁 Archivos Incluidos

```
personal-interno/
├── personal-interno.model.ts          # DTOs de datos
├── personal-interno.service.ts         # Servicio HTTP CRUD
├── personal-interno.component.ts       # Lógica principal
├── personal-interno.component.html     # Template ZEN
├── personal-interno.component.scss     # Estilos (Tailwind)
├── SNIPPETS-INTEGRACION.md            # Instrucciones de integración
├── README.md                           # Este archivo
```

---

## 🛠 Arquitectura

### **Model (`personal-interno.model.ts`)**
Define tres interfaces:
- `PersonalInternoResponseDTO` — Datos del personal (lectura desde API)
- `PersonalInternoRequestDTO` — Payload para crear/actualizar
- `UsuarioComboDTO` — Combo de usuarios (para referencias futuras)

### **Service (`personal-interno.service.ts`)**
Métodos HTTP:
- `listar()` — GET `/v1/maestras/personal-interno`
- `obtenerPorId(id)` — GET `/{id}`
- `crear(dto)` — POST `/`
- `actualizar(id, dto)` — PUT `/{id}`
- `eliminar(id)` — DELETE `/{id}`

### **Component (`personal-interno.component.ts`)**

**Signals (Estado Reactivo):**
- `personalList` — Lista de personal cargada
- `rolesProyecto`, `equipos` — Catálogos
- `cargando`, `guardando` — Estados de loading
- `modalVisible` — Control del modal
- `modo` — ('NUEVO' | 'EDITAR')
- `idSeleccionado` — ID del item en edición

**Validaciones del Formulario:**
```typescript
const form = {
  idUsuario: null,                    // Opcional
  dni: '',                            // Requerido
  nombresApellidos: '',               // Requerido
  correo: '',                         // Requerido + email
  codRolProyecto: '',                 // Requerido
  idEquipo: null                      // Requerido
}
```

---

## 🎨 Template (`personal-interno.component.html`)

**Secciones:**
1. **Encabezado** — Título + botón "+ Nuevo"
2. **Tabla (`p-table`)** — Columnas DNI, Nombres, Correo, Equipo, Rol, Acciones
3. **Modal (`p-dialog`)** — Formulario con grid 2 columnas (Tailwind responsive)
4. **Validaciones** — Mensajes de error debajo de inputs
5. **Botones** — Cancelar, Guardar/Actualizar

---

## 📝 Pasos de Integración

### **1. Rutas (src/app/app.routes.ts)**
Después de la ruta `maestros/contratos-slas`, agrega:
```typescript
{
  path: 'maestros/personal-interno',
  loadComponent: () => import('./features/maestros/personal-interno/personal-interno.component').then(m => m.PersonalInternoComponent),
},
```

### **2. Menú Sidebar (src/app/layout/layout.html)**
Después del elemento "SLAs" (línea ~99), agrega:
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

### **3. Rutas Seguras (src/app/layout/layout.ts - Opcional)**
En el array `rutasPadreSeguras`, agrega:
```typescript
'/maestros/personal-interno',
```

### **4. Catalogo de Equipos ⚠️**
Verifica el código correcto en `personal-interno.component.ts` línea ~101:
```typescript
// Reemplaza 'EQP_GRP' si el backend usa otro código
this.maestra.getConceptos('EQP_GRP').subscribe({...});
```

---

## 🚀 Uso

1. Navega a `/maestros/personal-interno`
2. Haz clic en "+ Nuevo" para crear personal
3. Completa el formulario y guarda
4. Haz clic en el ícono de lápiz para editar
5. Haz clic en el ícono de papelera para eliminar (con confirmación)

---

## 🔗 Dependencias Inyectadas

```typescript
private readonly fb = inject(FormBuilder);                          // Formularios
private readonly svc = inject(PersonalInternoService);              // CRUD HTTP
private readonly maestra = inject(MaestraService);                  // Catálogos
private readonly msg = inject(MessageService);                      // Toasts
private readonly actionService = inject(ActionOrchestratorService); // Confirmaciones
```

---

## 📦 Módulos de PrimeNG Utilizados

- `TableModule` — p-table (grilla)
- `ButtonModule` — p-button
- `InputTextModule` — input text
- `Select` — p-select (dropdowns)
- `Dialog` — p-dialog (modal)
- `Toast` — p-toast (notificaciones)
- `ConfirmDialog` — p-confirmDialog (centralizado)

---

## ✅ Checklist de Implementación

- [ ] Copiar ruta a `app.routes.ts`
- [ ] Copiar elemento de menú a `layout.html`
- [ ] (Opcional) Copiar ruta segura a `layout.ts`
- [ ] Verificar código del catálogo de equipos
- [ ] Compilar con `ng build`
- [ ] Probar la funcionalidad en navegador
- [ ] Verificar API backend de Personal Interno
- [ ] Verificar API backend de Equipos (concepto)

---

## 🐛 Troubleshooting

**Error: "Cannot find concepto EQUIPOS"**
→ Ajusta el código en línea ~101 del componente al código que use tu backend

**Error: "API no encontrada"**
→ Verifica que el backend exponga `/v1/maestras/personal-interno`

**Modal no se cierra**
→ Verifica que `modalVisible.set(false)` se ejecute en el guardar

---

## 📞 Soporte

Consulta el archivo `SNIPPETS-INTEGRACION.md` para instrucciones paso a paso.
