import { Component, OnInit, OnDestroy, inject, signal, viewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ActionOrchestratorService } from '../../../shared/services/action-orchestrator.service';

import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';
import { Drawer } from 'primeng/drawer';
import { Menu } from 'primeng/menu';

import { ContextoGlobalService } from '../../../core/services/contexto-global.service';
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
    RouterModule,
    Drawer,
    Menu,
    SeguimientosPanel,
  ],
  templateUrl: './requerimientos-list.html',
  styleUrl: './requerimientos-list.scss',
})
export class RequerimientosListComponent implements OnInit, OnDestroy {
  private readonly reqService = inject(RequerimientosService);
  private readonly router = inject(Router);
  private readonly service = inject(RequerimientosService);
  private readonly actionService = inject(ActionOrchestratorService);
  private readonly route = inject(ActivatedRoute);
  private readonly contextoGlobal = inject(ContextoGlobalService);

  // ── Estado reactivo ────────────────────────────────────────────────────
  requerimientos = signal<RequerimientoGridDTO[]>([]);
  totalRegistros = signal<number>(0);
  cargando = signal<boolean>(true);

  // Para la selección nativa de PrimeNG (valor plano, no signal — PrimeNG two-way binding)
  requerimientoSeleccionado: RequerimientoGridDTO | null = null;

  // Para que la tabla se posicione en la página correcta al restaurar el filtro
  primeraFila = 0;

  // Para la animación de fila nueva al volver del formulario
  idResaltado = signal<number | null>(null);

  // Para el panel lateral de seguimientos
  mostrarSidebarSeguimientos = signal(false);
  reqSeleccionadoParaSeguimiento = signal<RequerimientoGridDTO | null>(null);

  idSeguimientoDestacado = signal<number | null>(null);

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

  private primeraCarga = true;

  constructor() {
    // A) Lógica original del router
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state;
    if (state?.['nuevoIdDestacado']) {
      const idResaltado = Number(state['nuevoIdDestacado']);
      this.idResaltado.set(idResaltado);
    }

    // B) MOVEMOS la recuperación del filtro AQUÍ (para que esté listo antes del efecto)
    const filtroGuardado = this.service.obtenerFiltroGuardado();
    if (filtroGuardado) {
      this.filtroActual = { ...filtroGuardado };
      this.primeraFila = (this.filtroActual.page - 1) * this.filtroActual.size;
      this.service.limpiarFiltroGuardado();
    }

    // C) El Efecto Reactivo Inteligente
    effect(() => {
      const idContrato = this.contextoGlobal.idContratoActivo();

      if (idContrato !== null) {
        if (this.primeraCarga) {
          // Es la carga inicial: Respetamos el filtro guardado (si había uno)
          this.primeraCarga = false;
          this.cargarData();
        } else {
          // El usuario cambió el combo de contrato estando ya en esta pantalla
          // Aquí SÍ reseteamos la paginación porque es un contrato totalmente nuevo
          this.filtroActual.page = 1;
          this.primeraFila = 0;
          this.filtroActual.textoBusqueda = ''; // Opcional, pero recomendado
          this.cargarData();
        }
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    // 1. Buscador (Se queda igual)
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(texto => {
      this.filtroActual.textoBusqueda = texto;
      this.filtroActual.page = 1;
      this.primeraFila = 0;
      this.cargarData();
    });

    // 2. Limpieza de history (Se queda igual)
    if (history.state?.nuevoIdDestacado) {
      window.history.replaceState({}, '');
    }

    // 3. Deep Linking (Se queda exactamente igual)
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const idReq = params['abrirReq'];
      const idSeg = params['resaltarSeg'];

      console.log('1. [DeepLink] Parámetros leídos de URL:', { idReq, idSeg });

      if (idReq && idSeg) {
        console.log('2. [DeepLink] Iniciando hidratación para Req:', idReq);
        this.idSeguimientoDestacado.set(Number(idSeg));

        // Llamamos al endpoint (El Interceptor ya le inyecta el Contrato ID automáticamente)
        this.reqService.obtenerPorId(Number(idReq)).subscribe({
          next: (reqCompleto) => {
            console.log('3. [DeepLink] Data hidratada del backend:', reqCompleto);
            this.abrirSeguimientos(reqCompleto);
            console.log('4. [DeepLink] Orden de abrir panel ejecutada.');
          },
          error: (err) => {
            console.error('3b. [DeepLink] Error en hidratación', err);
            this.abrirSeguimientos({ id: Number(idReq) } as RequerimientoGridDTO);
          }
        });
      }
    });
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
          //{ label: 'Eliminar', icon: 'pi pi-trash', styleClass: 'menu-danger', command: () => this.confirmarEliminacion(req.id, req.nombre) },
        ],
      },
      {
        label: '<span class="block px-3 py-2.5 bg-green-50 border-l-3 border-green-500 text-[12px] font-semibold text-green-700 uppercase tracking-widest rounded-sm">Gestión</span>',
        escape: false,
        items: [
          { label: 'Gestionar Estimaciones', icon: 'pi pi-calculator', command: () => this.irAEstimaciones(req.id) },
          { label: 'Ver Entregables', icon: 'pi pi-box', command: () => this.irAEntregables(req.id) },
        ],
      },
    ];
  }

  // ── Navegación con guardado de filtro ──────────────────────────────────
  private irAEstimaciones(idRequerimiento: number): void {
    this.service.guardarFiltro(this.filtroActual);
    this.router.navigate(['/requerimientos', idRequerimiento, 'estimaciones'], {
      state: { nuevoIdDestacado: idRequerimiento }
    });
  }

  private irAEntregables(idRequerimiento: number): void {
    this.service.guardarFiltro(this.filtroActual);
    this.router.navigate(['/requerimientos', idRequerimiento, 'entregables'], {
      state: { nuevoIdDestacado: idRequerimiento }
    });
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
    this.actionService.ejecutar({
      header: 'Confirmar Eliminación',
      message: `¿Estás seguro de que deseas eliminar el requerimiento <b>"${nombre}"</b>?`,
      icon: 'pi pi-exclamation-triangle',
      acceptClass: 'p-button-danger p-button-sm',
      action: () => this.service.delete(id),
      onSuccess: () => this.cargarData()
    });
  }

  // ── Carga de datos ────────────────────────────────────────────────────
  cargarData(): void {
    this.cargando.set(true);
    this.reqService.buscarPaginado(this.filtroActual).subscribe({
      next: (res) => {
        this.requerimientos.set(res.data.contenido);
        this.totalRegistros.set(res.data.totalElementos);
        this.cargando.set(false);

        // Seleccionar la fila del requerimiento al que se estaba navegando
        const idPendiente = this.idResaltado();
        if (idPendiente !== null) {
          const req = res.data.contenido.find(r => r.id === idPendiente);
          if (req) {
            this.requerimientoSeleccionado = req;
            this.idResaltado.set(null);
          }
        }
      },
      error: (err) => {
        console.error('Error al cargar requerimientos', err);
        this.cargando.set(false);
      },
    });
  }


}
