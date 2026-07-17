import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

import { ActionOrchestratorService } from '../../../shared/services/action-orchestrator.service';
import { ContratoAdminService } from './contrato-admin.service';
import { ContratoResponse } from './contrato-admin.model';

@Component({
  selector: 'app-contratos-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TableModule,
    ButtonModule,
    Toast,
    ConfirmDialog,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './contratos-list.component.html',
  styleUrl: './contratos-list.component.scss',
})
export class ContratosListComponent implements OnInit {

  private readonly router = inject(Router);
  private readonly svc = inject(ContratoAdminService);
  private readonly msg = inject(MessageService);
  private readonly actionService = inject(ActionOrchestratorService);

  // ── Estado reactivo ───────────────────────────────────────────────────────

  readonly contratos = signal<ContratoResponse[]>([]);
  readonly cargando = signal(false);

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.cargarContratos();
  }

  // ── Métodos ───────────────────────────────────────────────────────────────

  cargarContratos(): void {
    this.cargando.set(true);
    this.svc.getContratos()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: c => this.contratos.set(c),
        error: () => this.toast('error', 'Error', 'No se pudieron cargar los contratos.'),
      });
  }

  nuevoContrato(): void {
    this.router.navigate(['/admin/contratos/nuevo']);
  }

  editarContrato(c: ContratoResponse): void {
    this.router.navigate(['/admin/contratos/editar', c.id]);
  }

  eliminarContrato(c: ContratoResponse, event: Event): void {
    event.stopPropagation();

    this.actionService.ejecutar({
      header: 'Confirmar baja lógica',
      message: `¿Dar de baja el contrato "<b>${c.codigoContrato}</b>"? La acción es reversible.`,
      icon: 'pi pi-exclamation-triangle',
      acceptClass: 'p-button-danger p-button-sm',
      action: () => this.svc.deleteContrato(c.id),
      onSuccess: () => this.cargarContratos(),
    });
  }

  // ── Privados ──────────────────────────────────────────────────────────────

  private toast(severity: string, summary: string, detail: string): void {
    this.msg.add({ severity, summary, detail, life: 4000 });
  }
}
