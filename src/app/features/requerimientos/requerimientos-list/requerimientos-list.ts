import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';

import { RequerimientosService } from '../services/requerimientos.service';
import { RequerimientoGridDTO, RequerimientoFiltroDTO, OrdenDTO } from '../models/requerimientos.models';

@Component({
  selector: 'app-requerimientos-list',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, InputTextModule, TagModule, TooltipModule, ConfirmDialog, RouterModule],
  providers: [ConfirmationService, MessageService],
  templateUrl: './requerimientos-list.html',
  styleUrl: './requerimientos-list.scss',
})
export class RequerimientosListComponent implements OnInit, OnDestroy {
  private readonly reqService = inject(RequerimientosService);
  private readonly router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private msg = inject(MessageService);
  private requerimientoService = inject(RequerimientosService);

  // Estado reactivo con Signals (Modern Angular 20)
  requerimientos = signal<RequerimientoGridDTO[]>([]);
  totalRegistros = signal<number>(0);
  cargando = signal<boolean>(true);

  // Para la selección nativa de PrimeNG
  requerimientoSeleccionado = signal<any>(null);
  // Para la animación temporal
  idResaltado = signal<number | null>(null);

  // Objeto de filtro persistente
  filtroActual: RequerimientoFiltroDTO = {
    page: 1,
    size: 10,
    textoBusqueda: '',
    orden: []
  };

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor() {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state;

    if (state && state['nuevoIdDestacado']) {
      this.idResaltado.set(Number(state['nuevoIdDestacado']));
      console.log('🐞 [LIST] ID atrapado en el constructor:', this.idResaltado());
      // El temporizador de limpieza se inicia en cargarData() para que
      // el reloj arranque cuando la fila ya está renderizada en el DOM.
    }
  }

  ngOnInit(): void {
    console.log('🐞 [LIST] State del Router al iniciar:', history.state);
    // Escuchador de caja de búsqueda con "Live Search" Debounce 400ms
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(texto => {
      this.filtroActual.textoBusqueda = texto;
      this.filtroActual.page = 1; // Reiniciar a la página 1 al buscar
      this.cargarData();
    });

    const state = history.state;
    if (state && state.nuevoIdDestacado) {
      //this.idResaltado.set(Number(state.nuevoIdDestacado));

      console.log('🐞 [LIST] Señal idResaltado seteada a:', this.idResaltado());

      // Truco PRO: Limpiamos el history state para que si el usuario
      // presiona F5 (Actualizar), la fila no vuelva a parpadear.
      window.history.replaceState({}, '');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onBuscar(event: Event): void {
    const texto = (event.target as HTMLInputElement).value;
    this.searchSubject.next(texto);
  }

  // Intercepta la paginación y ordenamiento de PrimeNG
  onLazyLoad(event: TableLazyLoadEvent): void {
    this.filtroActual.size = event.rows || 10;
    this.filtroActual.page = ((event.first || 0) / this.filtroActual.size) + 1;

    // Mapeo de Multi-sort para la Whitelist del Backend
    if (event.multiSortMeta && event.multiSortMeta.length > 0) {
      this.filtroActual.orden = event.multiSortMeta.map(sort => ({
        campo: sort.field,
        direccion: sort.order === 1 ? 'ASC' : 'DESC'
      } as OrdenDTO));
    } else {
      this.filtroActual.orden = [];
    }

    this.cargarData();
  }

  private cargarData(): void {
    this.cargando.set(true);
    this.reqService.buscarPaginado(this.filtroActual).subscribe({
      next: (res) => {
        this.requerimientos.set(res.data.contenido); // Mapeo al array del JSON de Spring Boot
        this.totalRegistros.set(res.data.totalElementos);
        this.cargando.set(false);

        // Iniciamos el temporizador de limpieza AQUÍ, cuando los datos
        // ya llegaron y Angular renderizará la fila en el siguiente ciclo.
        // 5500 ms > duración de la animación (5 s) para no cortarla.
        if (this.idResaltado() !== null) {
          setTimeout(() => this.idResaltado.set(null), 5500);
        }
      },
      error: (err) => {
        console.error('Error al cargar la grilla de requerimientos', err);
        this.cargando.set(false);
      }
    });
  }

  /**
   * Retorna la clase CSS definida en el archivo .scss (estilo de Claude)
   * según el código de estado del requerimiento.
   */
  getBadgeClass(codigo: string): string {
    switch (codigo) {
      case 'REQ_REG': return 'badge-info';
      case 'REQ_CUR': return 'badge-warn';
      case 'REQ_ATE': return 'badge-success';
      case 'REQ_ANU': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  // Navegación Programática
  nuevoRequerimiento(): void {
    this.router.navigate(['/requerimientos/nuevo']);
  }

  editarRequerimiento(id: number): void {
    // La ruta debe estar configurada en app.routes.ts como 'requerimientos/:id/editar'
    this.router.navigate(['/requerimientos', id, 'editar']);
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
        // 🚀 Si el usuario dice "Sí", disparamos el DELETE
        this.requerimientoService.eliminar(id).subscribe({
          next: () => {
            this.msg.add({
              severity: 'success',
              summary: 'Eliminado',
              detail: 'El requerimiento fue eliminado correctamente.',
              life: 3000
            });
            // 👇 Recargamos la tabla para que el registro desaparezca visualmente
            this.cargarData(); // Reemplaza por el nombre de tu método de carga
          },
          error: (err) => {
            this.msg.add({
              severity: 'error',
              summary: 'Error al eliminar',
              detail: err.error?.message || 'No se pudo eliminar el requerimiento. Puede que tenga dependencias.',
              life: 5000
            });
          }
        });
      }
    });
  }


}
