import { Component, OnInit, computed, inject, input, signal, effect, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';

import { ActionOrchestratorService } from '../../../shared/services/action-orchestrator.service';
import { ContratoAdminService } from './contrato-admin.service';
import { ContratoCicloDTO } from './contrato-admin.model';

@Component({
  selector: 'app-contrato-ciclos-tab',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    Toast,
    TagModule,
  ],
  providers: [MessageService],
  templateUrl: './contrato-ciclos-tab.component.html',
  styleUrl: './contrato-ciclos-tab.component.scss',
})
export class ContratoCiclosTabComponent implements OnInit {

  private readonly svc = inject(ContratoAdminService);
  private readonly msg = inject(MessageService);
  private readonly actionService = inject(ActionOrchestratorService);

  // ── Inputs & Outputs ──────────────────────────────────────────────────────

  readonly contratoId = input.required<number>();
  readonly onCiclosCambiados = output<void>();

  // ── Estado reactivo ───────────────────────────────────────────────────────

  readonly ciclos = signal<ContratoCicloDTO[]>([]);
  readonly cargando = signal(false);
  readonly procesando = signal(false);

  readonly ultimoCicloId = computed(() => {
    const lista = this.ciclos();
    if (lista.length === 0) return -1;
    return lista[lista.length - 1]?.id ?? -1;
  });

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  constructor() {
    effect(() => {
      const idContrato = this.contratoId();
      if (idContrato && idContrato > 0) {
        this.cargarCiclos();
      }
    });
  }

  ngOnInit(): void {
    // La lógica de carga está en el effect() del constructor
  }

  // ── Métodos ───────────────────────────────────────────────────────────────

  private cargarCiclos(): void {
    this.cargando.set(true);
    this.svc.getCiclos(this.contratoId())
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ciclos => this.ciclos.set(ciclos),
        error: () => this.toast('error', 'Error', 'No se pudieron cargar los ciclos.'),
      });
  }

  generarCiclos(): void {
    this.actionService.ejecutar({
      header: 'Confirmar Generación',
      message: '¿Generar ciclos faltantes para este contrato?',
      icon: 'pi pi-exclamation-triangle',
      acceptClass: 'p-button-primary',
      action: () => this.svc.generarCiclos(this.contratoId()),
      onStart: () => this.procesando.set(true),
      onComplete: () => this.procesando.set(false),
      onSuccess: () => {
        this.cargarCiclos();
        this.onCiclosCambiados.emit();
      },
    });
  }

  eliminarCiclo(ciclo: ContratoCicloDTO, event: Event): void {
    event.stopPropagation();

    this.actionService.ejecutar({
      header: 'Confirmar Eliminación',
      message: `¿Eliminar el ciclo "<b>${ciclo.nombreCiclo}</b>"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptClass: 'p-button-danger',
      action: () => this.svc.eliminarCiclo(this.contratoId(), ciclo.id),
      onSuccess: () => {
        this.cargarCiclos();
        this.onCiclosCambiados.emit();
      },
    });
  }

  // ── Privados ──────────────────────────────────────────────────────────────

  private toast(severity: string, summary: string, detail: string): void {
    this.msg.add({ severity, summary, detail, life: 4000 });
  }

  getEstadoBadge(esCerrado: boolean): { label: string; severity: 'success' | 'danger' } {
    return esCerrado
      ? { label: 'Cerrado', severity: 'danger' }
      : { label: 'Abierto', severity: 'success' };
  }

  puedeEliminar(ciclo: ContratoCicloDTO): boolean {
    return ciclo.id === this.ultimoCicloId() && !ciclo.esCerrado;
  }
}
