import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize, map } from 'rxjs/operators';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { Dialog } from 'primeng/dialog';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

import { ActionOrchestratorService } from '../../../shared/services/action-orchestrator.service';
import { MaestraService } from '../../../core/services/maestra.service';
import { ContratoAdminService } from './contrato-admin.service';
import { ConceptoDTO } from '../../../core/models/maestra.model';
import {
  ContratoGtResponse,
  ContratoGtRequest,
} from './contrato-admin.model';

@Component({
  selector: 'app-contrato-gt-tab',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputNumberModule,
    Select,
    Dialog,
    Toast,
    ConfirmDialog,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './contrato-gt-tab.component.html',
  styleUrl: './contrato-gt-tab.component.scss',
})
export class ContratoGtTabComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(ContratoAdminService);
  private readonly maestra = inject(MaestraService);
  private readonly msg = inject(MessageService);
  private readonly actionService = inject(ActionOrchestratorService);

  // ── Inputs ────────────────────────────────────────────────────────────────

  readonly contratoId = input.required<number>();

  // ── Estado reactivo ───────────────────────────────────────────────────────

  readonly gruposTec = signal<ContratoGtResponse[]>([]);
  readonly gruposTecOpts = signal<ConceptoDTO[]>([]);

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly modal = signal(false);

  readonly gtEnEdicion = signal<ContratoGtResponse | null>(null);

  readonly titulo = computed(() =>
    this.gtEnEdicion() ? 'Editar Grupo Tecnológico' : 'Agregar Grupo Tecnológico'
  );
  readonly labelBtn = computed(() =>
    this.gtEnEdicion() ? 'Actualizar' : 'Guardar'
  );

  // ── Formulario ────────────────────────────────────────────────────────────

  readonly form = this.fb.group({
    codGrupoTecnologico: this.fb.nonNullable.control('', Validators.required),
    horasContratadas: this.fb.nonNullable.control<number>(0, [Validators.required, Validators.min(0)]),
    horasLineaBase: this.fb.nonNullable.control<number>(0, [Validators.required, Validators.min(0)]),
    precioUnitario: this.fb.nonNullable.control<number>(0, [Validators.required, Validators.min(0)]),
  });

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.cargarGruposTec();
    this.cargarOpciones();
  }

  // ── Métodos ───────────────────────────────────────────────────────────────

  private cargarGruposTec(): void {
    this.cargando.set(true);
    this.svc.getGruposTecnologicos(this.contratoId())
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: g => this.gruposTec.set(g),
        error: () => this.toast('error', 'Error', 'No se pudieron cargar los grupos.'),
      });
  }

  private cargarOpciones(): void {
    this.maestra.getConceptos('GRP_TEC')
      .subscribe({
        next: opts => this.gruposTecOpts.set(opts),
        error: () => this.toast('warn', 'Advertencia', 'No se cargaron los grupos tecnológicos.'),
      });
  }

  abrirNuevo(): void {
    this.gtEnEdicion.set(null);
    this.form.reset();
    this.modal.set(true);
  }

  editar(gt: ContratoGtResponse, event: Event): void {
    event.stopPropagation();
    this.gtEnEdicion.set(gt);
    this.form.patchValue({
      codGrupoTecnologico: gt.codGrupoTecnologico,
      horasContratadas: gt.horasContratadas,
      horasLineaBase: gt.horasLineaBase,
      precioUnitario: gt.precioUnitario,
    });
    this.modal.set(true);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const raw: ContratoGtRequest = this.form.getRawValue();
    const enEdicion = this.gtEnEdicion();

    const observer = {
      next: () => {
        this.toast(
          'success',
          enEdicion ? 'Actualizado' : 'Creado',
          'Grupo guardado correctamente.'
        );
        this.modal.set(false);
        this.cargarGruposTec();
      },
      error: (err: any) =>
        this.toast(
          'error',
          'Error al guardar',
          err.error?.mensaje ?? 'No se pudo guardar el grupo.'
        ),
    };

    if (enEdicion) {
      this.svc.updateGrupoTecnologico(this.contratoId(), enEdicion.id, raw)
        .pipe(finalize(() => this.guardando.set(false)))
        .subscribe(observer);
    } else {
      this.svc.createGrupoTecnologico(this.contratoId(), raw)
        .pipe(finalize(() => this.guardando.set(false)))
        .subscribe(observer);
    }
  }

  eliminar(gt: ContratoGtResponse, event: Event): void {
    event.stopPropagation();

    this.actionService.ejecutar({
      header: 'Confirmar baja lógica',
      message: `¿Dar de baja el grupo "<b>${gt.descripcionGrupo}</b>"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptClass: 'p-button-danger p-button-sm',
      action: () => this.svc.deleteGrupoTecnologico(this.contratoId(), gt.id),
      onSuccess: () => this.cargarGruposTec(),
    });
  }

  // ── Privados ──────────────────────────────────────────────────────────────

  private toast(severity: string, summary: string, detail: string): void {
    this.msg.add({ severity, summary, detail, life: 4000 });
  }

  obtenerDescripcion(cod: string): string {
    const opt = this.gruposTecOpts().find(o => o.codigo === cod);
    return opt ? opt.nombre : cod;
  }
}
