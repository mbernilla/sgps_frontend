import { Component, OnInit, OnDestroy, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Drawer } from 'primeng/drawer';
import { Menu } from 'primeng/menu';

import { RequerimientosService } from '../services/requerimientos.service';
import { RequerimientoGridDTO, RequerimientoFiltroDTO, OrdenDTO } from '../models/requerimientos.models';
import { SeguimientosPanel } from '../components/seguimientos-panel/seguimientos-panel';

@Component({
  selector: 'app-requerimientos-list',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    TooltipModule,
    ConfirmDialog,
    RouterModule,
    Drawer,
    Menu,
    SeguimientosPanel,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './requerimientos-list.html',
  styleUrl: './requerimientos-list.scss',
})
export class RequerimientosListComponent implements OnInit, OnDestroy {
  private readonly reqService = inject(RequerimientosService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly msg = inject(MessageService);
  private readonly requerimientoService = inject(RequerimientosService);

  // ── Estado reactivo ────────────────────────────────────────────────────
  requerimientos = signal<RequerimientoGridDTO[]>([]);
  totalRegistros = signal<number>(0);
  cargando = signal<boolean>(true);

  // Para la selección nativa de PrimeNG
  requerimientoSeleccionado = signal<any>(null);

  // Para la animación de fila nueva al volver del formulario
  idResaltado = signal<number | null>(null);

  // Para el panel lateral de seguimientos
  mostrarSidebarSeguimientos = signal(false);
  reqSeleccionadoParaSeguimiento = signal<RequerimientoGridDTO | null>(null);

  // Menú contextual de acciones por fila
  menuItems = signal<MenuItem[]>([]);
  private readonly accioesMenu = viewChild.required<Menu>('accioesMenu');

  // ── Filtros ────────────────────────────────────────────────────────────
  filtroActual: RequerimientoFiltroDTO = {
    page: 1,
    size: 10,
    textoBusqueda: '',
    orden: [],
  };

  private readonly searchSubject = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor() {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state;

    if (state?.['nuevoIdDestacado']) {
      this.idResaltado.set(Number(state['nuevoIdDestacado']));
    }
  }

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(texto => {
      this.filtroActual.textoBusqueda = texto;
      this.filtroActual.page = 1;
      this.cargarData();
    });

    const state = history.state;
    if (state?.nuevoIdDestacado) {
      window.history.replaceState({}, '');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Eventos de tabla ───────────────────────────────────────────────────
  onBuscar(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.filtroActual.size = event.rows ?? 10;
    this.filtroActual.page = ((event.first ?? 0) / this.filtroActual.size) + 1;

    if (event.multiSortMeta?.length) {
      this.filtroActual.orden = event.multiSortMeta.map(sort => ({
        campo: sort.field,
        direccion: sort.order === 1 ? 'ASC' : 'DESC',
      } as OrdenDTO));
    } else {
      this.filtroActual.orden = [];
    }

    this.cargarData();
  }

  // ── Menú contextual ────────────────────────────────────────────────────
  abrirMenu(event: Event, req: RequerimientoGridDTO): void {
    this.menuItems.set(this.buildMenuItems(req));
    this.accioesMenu().toggle(event);
  }

  private buildMenuItems(req: RequerimientoGridDTO): MenuItem[] {
    return [
      {
        label: '<span class="block px-3 py-2.5 bg-green-50 border-l-3 border-green-500 text-[12px] font-semibold text-green-700 uppercase tracking-widest rounded-sm">Datos del Requerimiento</span>',
        escape: false,
        items: [
          { label: 'Ver', icon: 'pi pi-eye', command: () => this.router.navigate(['/requerimientos/ver', req.id]) },
          { label: 'Editar', icon: 'pi pi-pencil', command: () => this.router.navigate(['/requerimientos/editar', req.id]) },
          { label: 'Eliminar', icon: 'pi pi-trash', styleClass: 'menu-danger', command: () => this.confirmarEliminacion(req.id, req.nombre) },
        ],
      },
      {
        label: '<span class="block px-3 py-2.5 bg-green-50 border-l-3 border-green-500 text-[12px] font-semibold text-green-700 uppercase tracking-widest rounded-sm">Gestión</span>',
        escape: false,
        items: [
          { label: 'Gestionar Estimaciones', icon: 'pi pi-calculator', command: () => this.router.navigate(['/requerimientos', req.id, 'estimaciones']) },
          { label: 'Ver Entregables', icon: 'pi pi-box', command: () => this.router.navigate(['/requerimientos', req.id, 'entregables']) },
        ],
      },
    ];
  }

  // ── Sidebar de seguimientos ────────────────────────────────────────────
  abrirSeguimientos(req: RequerimientoGridDTO): void {
    this.reqSeleccionadoParaSeguimiento.set(req);
    this.mostrarSidebarSeguimientos.set(true);
  }

  // ── Helpers de badge ──────────────────────────────────────────────────
  getBadgeClass(codigo: string): string {
    const map: Record<string, string> = {
      REQ_REG: 'badge-info',
      REQ_CUR: 'badge-warn',
      REQ_ATE: 'badge-success',
      REQ_ANU: 'badge-danger',
    };
    return map[codigo] ?? 'badge-secondary';
  }

  // ── Navegación ────────────────────────────────────────────────────────
  nuevoRequerimiento(): void {
    this.router.navigate(['/requerimientos/nuevo']);
  }

  confirmarEliminacion(id: number, nombre: string): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas eliminar el requerimiento <b>"${nombre}"</b>?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-text p-button-sm',
      accept: () => {
        this.requerimientoService.eliminar(id).subscribe({
          next: () => {
            this.msg.add({
              severity: 'success',
              summary: 'Eliminado',
              detail: 'El requerimiento fue eliminado correctamente.',
              life: 3000,
            });
            this.cargarData();
          },
          error: (err) => {
            this.msg.add({
              severity: 'error',
              summary: 'Error al eliminar',
              detail: err.error?.message ?? 'No se pudo eliminar el requerimiento.',
              life: 5000,
            });
          },
        });
      },
    });
  }

  // ── Carga de datos ────────────────────────────────────────────────────
  private cargarData(): void {
    this.cargando.set(true);
    this.reqService.buscarPaginado(this.filtroActual).subscribe({
      next: (res) => {
        this.requerimientos.set(res.data.contenido);
        this.totalRegistros.set(res.data.totalElementos);
        this.cargando.set(false);

        if (this.idResaltado() !== null) {
          setTimeout(() => this.idResaltado.set(null), 5500);
        }
      },
      error: (err) => {
        console.error('Error al cargar requerimientos', err);
        this.cargando.set(false);
      },
    });
  }

  getEstimacionClass(estimacion: string): string {
    if (!estimacion) return '';
    if (estimacion.startsWith('RFC')) return 'code-rfc';

    const classes: { [key: string]: string } = {
      'EST-INI': 'code-ini',
      'EST-ANA': 'code-ana',
      'EST-DIS': 'code-dis'
    };

    return classes[estimacion] || 'badge-default'; // 'badge-default' por si llega algo inesperado
  }
}
