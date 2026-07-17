import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { RequerimientosFormComponent } from './features/requerimientos/requerimientos-form/requerimientos-form';

// 👇 1. Importa tu Layout
import { LayoutComponent } from './layout/layout'; // Ajusta el path a tu archivo real

export const routes: Routes = [

  // ==========================================
  // RUTAS PÚBLICAS (Se renderizan sin Layout)
  // ==========================================
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },

  // ==========================================
  // RUTAS PRIVADAS (Se renderizan DENTRO del Layout)
  // ==========================================
  {
    path: '',
    component: LayoutComponent, // El Layout es el contenedor padre
    canActivate: [authGuard],   // Protegemos TODAS las rutas hijas de un solo golpe
    children: [
      { path: '', redirectTo: 'requerimientos', pathMatch: 'full' },

      // Requerimientos
      {
        path: 'requerimientos',
        loadComponent: () => import('./features/requerimientos/requerimientos-list/requerimientos-list').then(m => m.RequerimientosListComponent),
      },
      {
        path: 'requerimientos/nuevo',
        loadComponent: () => import('./features/requerimientos/requerimientos-form/requerimientos-form').then(m => m.RequerimientosFormComponent),
      },
      { path: 'requerimientos/editar/:id', component: RequerimientosFormComponent },
      { path: 'requerimientos/ver/:id',    component: RequerimientosFormComponent },
      {
        path: 'requerimientos/:id/estimaciones',
        loadComponent: () => import('./features/requerimientos/components/estimaciones-panel/estimaciones-panel').then(m => m.EstimacionesPanelComponent),
      },
      {
        path: 'requerimientos/:id/entregables',
        loadComponent: () => import('./features/requerimientos/components/entregables-panel/entregables-panel').then(m => m.EntregablesPanelComponent),
      },

      // Conciliaciones
      {
        path: 'conciliaciones/maestro',
        loadComponent: () => import('./features/conciliaciones/ciclos-list/ciclos-list').then(m => m.CiclosListComponent),
      },
      {
        path: 'conciliaciones/gestion/:id',
        loadComponent: () => import('./features/conciliaciones/ciclo-detalle/ciclo-detalle').then(m => m.CicloDetalleComponent),
      },
      {
        path: 'conciliaciones/ciclos/:idCiclo/penalidades',
        loadComponent: () => import('./features/conciliaciones/penalidades/penalidades.component').then(m => m.PenalidadesComponent),
      },
      {
        path: 'conciliaciones/ciclos/:idCiclo/costos-abc',
        loadComponent: () => import('./features/conciliaciones/costos-abc/costos-abc.component').then(m => m.CostosAbcComponent),
      },

      // Maestros
      {
        path: 'maestros/sistemas',
        loadComponent: () => import('./features/maestros/sistemas/sistemas-admin').then(m => m.SistemasAdminComponent),
      },
      {
        path: 'maestros/catalogo-entregables',
        loadComponent: () => import('./features/maestros/catalogo-entregables/catalogo-entregables.component').then(m => m.CatalogoEntregablesComponent),
      },
      {
        path: 'maestros/contratos-slas',
        loadComponent: () => import('./features/maestros/contratos-slas/contratos-slas.component').then(m => m.ContratosSlasComponent),
      },

      // Administración
      {
        path: 'admin/contratos',
        loadComponent: () => import('./features/admin/contratos/contratos-list.component').then(m => m.ContratosListComponent),
      },
      {
        path: 'admin/contratos/nuevo',
        loadComponent: () => import('./features/admin/contratos/contrato-form.component').then(m => m.ContratoFormComponent),
      },
      {
        path: 'admin/contratos/editar/:id',
        loadComponent: () => import('./features/admin/contratos/contrato-form.component').then(m => m.ContratoFormComponent),
      },
    ]
  },

  // ==========================================
  // WILDCARD (Ruta no encontrada)
  // ==========================================
  { path: '**', redirectTo: 'login' },
];
