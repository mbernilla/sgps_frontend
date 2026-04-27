import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { RequerimientosFormComponent } from './features/requerimientos/requerimientos-form/requerimientos-form';
//import { RequerimientosListComponent } from './features/requerimientos/requerimientos-list/requerimientos-list';

export const routes: Routes = [
  // Raíz: el guard de requerimientos redirige a /login si no hay sesión
  { path: '', redirectTo: 'requerimientos', pathMatch: 'full' },

  // Login (público)
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },

  // Requerimientos (protegido)
  {
    path: 'requerimientos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/requerimientos/requerimientos-list/requerimientos-list').then(
        m => m.RequerimientosListComponent
      ),
  },
  {
    path: 'requerimientos/nuevo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/requerimientos/requerimientos-form/requerimientos-form').then(
        m => m.RequerimientosFormComponent
      ),
  },

  { path: 'requerimientos/editar/:id', component: RequerimientosFormComponent, canActivate: [authGuard] },
  { path: 'requerimientos/ver/:id',   component: RequerimientosFormComponent, canActivate: [authGuard] },

  {
    path: 'requerimientos/:id/estimaciones',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/requerimientos/components/estimaciones-panel/estimaciones-panel').then(
        m => m.EstimacionesPanelComponent
      ),
  },
  {
    path: 'requerimientos/:id/entregables',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/requerimientos/components/entregables-panel/entregables-panel').then(
        m => m.EntregablesPanelComponent
      ),
  },

  // Conciliaciones
  {
    path: 'conciliaciones/maestro',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/conciliaciones/ciclos-list/ciclos-list').then(m => m.CiclosListComponent),
  },
  {
    path: 'conciliaciones/gestion/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/conciliaciones/ciclo-detalle/ciclo-detalle').then(m => m.CicloDetalleComponent),
  },
  {
    path: 'conciliaciones/ciclos/:idCiclo/penalidades',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/conciliaciones/penalidades/penalidades.component').then(m => m.PenalidadesComponent),
  },

  // Maestros
  {
    path: 'maestros/sistemas',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/maestros/sistemas/sistemas-admin').then(m => m.SistemasAdminComponent),
  },

  // Wildcard
  { path: '**', redirectTo: 'login' },
];
