import { Component, OnInit, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { finalize, map } from 'rxjs/operators';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Dialog } from 'primeng/dialog';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { PrimeTemplate, ConfirmationService, MessageService } from 'primeng/api';

import { ContextoGlobalService } from '../../../core/services/contexto-global.service';
import { ActionOrchestratorService } from '../../../shared/services/action-orchestrator.service';
import { ContratoSlaService } from './contrato-sla.service';
import { ContratoApiService } from '../contratos/service/ContratoApiService';
import {
  ContratoSlaResponse,
  ContratoSlaRequest,
} from './contrato-sla.model';
import { ContratoSelectorDTO } from '../models/contrato-selector.model';

@Component({
  selector: 'app-contratos-slas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    Select,
    Dialog,
    Toast,
    ConfirmDialog,
    TooltipModule,
    PrimeTemplate,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './contratos-slas.component.html',
  styleUrl: './contratos-slas.component.scss',
})
export class ContratosSlasComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(ContratoSlaService);
  private readonly contextoGlobal = inject(ContextoGlobalService);
  private readonly msg = inject(MessageService);
  private readonly actionService = inject(ActionOrchestratorService);
  private readonly contratoApiService = inject(ContratoApiService);

  // ── Estado reactivo ───────────────────────────────────────────────────────

  readonly slas = signal<ContratoSlaResponse[]>([]);
  readonly contratosOrigen = signal<ContratoSelectorDTO[]>([]);

  readonly cargandoSlas = signal(false);
  guardandoSla = signal(false);
  readonly clonaindoSlas = signal(false);
  readonly modalSla = signal(false);
  readonly modalClonar = signal(false);

  readonly slaEnEdicion = signal<ContratoSlaResponse | null>(null);
  readonly contratoOrigenSeleccionado = signal<number | null>(null);

  readonly tituloModalSla = computed(() =>
    this.slaEnEdicion() ? 'Editar SLA' : 'Nuevo SLA'
  );
  readonly labelBtnSla = computed(() =>
    this.slaEnEdicion() ? 'Actualizar' : 'Guardar'
  );

  // ── Formularios ───────────────────────────────────────────────────────────

  readonly formSla = this.fb.group({
    codigoSla: this.fb.nonNullable.control('', Validators.required),
    nombre: this.fb.nonNullable.control('', Validators.required),
    descripcionFormula: this.fb.nonNullable.control('', Validators.required),
  });

  constructor() {
    effect(() => {
      const contratoActivo = this.contextoGlobal.contratoActual();
      if (contratoActivo) {
        this.cargarSlas();
      }
    });
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Las cargas se manejan en el effect() del constructor
  }

  // ── SLAs ──────────────────────────────────────────────────────────────────

  cargarSlas(): void {
    this.cargandoSlas.set(true);
    this.svc.getSlas()
      .pipe(finalize(() => this.cargandoSlas.set(false)))
      .subscribe({
        next: s => this.slas.set(s),
        error: () => this.toast('error', 'Error', 'No se pudieron cargar los SLAs.'),
      });
  }

  abrirNuevoSla(): void {
    this.slaEnEdicion.set(null);
    this.formSla.reset();
    this.modalSla.set(true);
  }

  editarSla(s: ContratoSlaResponse, event: Event): void {
    event.stopPropagation();
    this.slaEnEdicion.set(s);
    this.formSla.patchValue({
      codigoSla: s.codigoSla,
      nombre: s.nombre,
      descripcionFormula: s.descripcionFormula,
    });
    this.modalSla.set(true);
  }

  guardarSla(): void {
    if (this.formSla.invalid) {
      this.formSla.markAllAsTouched();
      return;
    }
    this.guardandoSla.set(true);

    const raw: ContratoSlaRequest = this.formSla.getRawValue();
    const enEdicion = this.slaEnEdicion();

    const observer = {
      next: () => {
        this.toast(
          'success',
          enEdicion ? 'Actualizado' : 'Creado',
          'SLA guardado correctamente.'
        );
        this.modalSla.set(false);
        this.cargarSlas();
      },
      error: (err: any) =>
        this.toast(
          'error',
          'Error al guardar',
          err.error?.mensaje ?? 'No se pudo guardar el SLA.'
        ),
    };

    if (enEdicion) {
      this.svc.updateSla(enEdicion.id, raw)
        .pipe(finalize(() => this.guardandoSla.set(false)))
        .subscribe(observer);
    } else {
      this.svc.createSla(raw)
        .pipe(finalize(() => this.guardandoSla.set(false)))
        .subscribe(observer);
    }
  }

  eliminarSla(s: ContratoSlaResponse, event: Event): void {
    event.stopPropagation();

    this.actionService.ejecutar({
      header: 'Confirmar baja lógica',
      message: `¿Dar de baja el SLA "<b>${s.nombre}</b>"? La acción es reversible.`,
      icon: 'pi pi-exclamation-triangle',
      acceptClass: 'p-button-danger p-button-sm',
      action: () => this.svc.deleteSla(s.id),
      onSuccess: () => this.cargarSlas(),
    });
  }

  // ── Clonación ─────────────────────────────────────────────────────────────

  abrirModalClonar(): void {
    this.contratoOrigenSeleccionado.set(null);
    this.clonaindoSlas.set(false);
    this.cargarContratosOrigen();
    this.modalClonar.set(true);
  }

  private cargarContratosOrigen(): void {
    this.contratoApiService.listarContratosSelector().subscribe({
      next: contratos => {
        const contratoActualId = this.contextoGlobal.contratoActual()?.id;
        const filtrados = contratos.filter(c => c.id !== contratoActualId);
        this.contratosOrigen.set(filtrados);
      },
      error: () => this.toast('warn', 'Advertencia', 'No se pudieron cargar los contratos origen.'),
    });
  }

  confirmarClonacion(): void {
    const idOrigen = this.contratoOrigenSeleccionado();
    if (!idOrigen) return;

    this.clonaindoSlas.set(true);
    this.svc.clonarSlas(idOrigen)
      .pipe(finalize(() => this.clonaindoSlas.set(false)))
      .subscribe({
        next: () => {
          this.toast(
            'success',
            'Clonación exitosa',
            'Los SLAs se clonaron correctamente.'
          );
          this.modalClonar.set(false);
          this.cargarSlas();
        },
        error: (err: any) =>
          this.toast(
            'error',
            'Error al clonar',
            err.error?.mensaje ?? 'No se pudieron clonar los SLAs.'
          ),
      });
  }

  // ── Privados ──────────────────────────────────────────────────────────────

  private toast(severity: string, summary: string, detail: string): void {
    this.msg.add({ severity, summary, detail, life: 4000 });
  }
}
