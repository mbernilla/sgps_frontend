import { Component, OnInit, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormControl } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { finalize, map } from 'rxjs/operators';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { Select } from 'primeng/select';
import { Dialog } from 'primeng/dialog';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { PrimeTemplate, ConfirmationService, MessageService } from 'primeng/api';

import { ContextoGlobalService } from '../../../core/services/contexto-global.service';
import { ActionOrchestratorService } from '../../../shared/services/action-orchestrator.service';
import { MaestraService } from '../../../core/services/maestra.service';
import { CatalogoEntregableService } from './catalogo-entregable.service';
import { ContratoApiService } from '../contratos/service/ContratoApiService';
import { ContratoSelectorDTO } from '../models/contrato-selector.model';
import {
  CatalogoEntregableResponse,
  CatalogoEntregableRequest,
} from './catalogo-entregable.model';

interface FaseOpt {
  id: string | number;
  nombre: string;
  [key: string]: any;
}

@Component({
  selector: 'app-catalogo-entregables',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    Select,
    Dialog,
    Toast,
    ConfirmDialog,
    TooltipModule,
    PrimeTemplate,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './catalogo-entregables.component.html',
  styleUrl: './catalogo-entregables.component.scss',
})
export class CatalogoEntregablesComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(CatalogoEntregableService);
  private readonly maestra = inject(MaestraService);
  private readonly msg = inject(MessageService);
  private readonly actionService = inject(ActionOrchestratorService);
  private readonly contextoGlobal = inject(ContextoGlobalService);
  private readonly contratoApiService = inject(ContratoApiService);

  // ── Estado reactivo ───────────────────────────────────────────────────────

  readonly entregables = signal<CatalogoEntregableResponse[]>([]);
  readonly fasesOpts = signal<FaseOpt[]>([]);
  readonly contratosOrigen = signal<ContratoSelectorDTO[]>([]);

  readonly cargandoEntregables = signal(false);
  readonly guardandoEntregable = signal(false);
  readonly clonaindoCatalogo = signal(false);
  readonly modalEntregable = signal(false);
  readonly modalClonar = signal(false);

  readonly entregableEnEdicion = signal<CatalogoEntregableResponse | null>(null);
  readonly contratoOrigenSeleccionado = signal<number | null>(null);

  readonly tituloModalEntregable = computed(() =>
    this.entregableEnEdicion() ? 'Editar Entregable' : 'Nuevo Entregable'
  );
  readonly labelBtnEntregable = computed(() =>
    this.entregableEnEdicion() ? 'Actualizar' : 'Guardar'
  );

  // ── Formulario ────────────────────────────────────────────────────────────

  readonly formEntregable = this.fb.group({
    nombre: this.fb.nonNullable.control('', Validators.required),
    abreviatura: this.fb.nonNullable.control('', Validators.required),
    codFase: this.fb.nonNullable.control('', Validators.required),
    esEntregableFisico: this.fb.nonNullable.control(false),
    extensionesPermitidas: this.fb.nonNullable.control(''),
    tamanioMaximoMb: this.fb.nonNullable.control(0, [Validators.min(0)]),
  });

  constructor() {
    // Este efecto se dispara automáticamente al cargar la página
    // y se vuelve a disparar CADA VEZ que el contrato cambia en el Top Bar.
    effect(() => {
      const contratoActivo = this.contextoGlobal.contratoActual();

      if (contratoActivo) {
        this.cargarEntregables();
      }
    });
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.cargarFases();
    //this.cargarEntregables();
  }

  // ── Entregables ───────────────────────────────────────────────────────────

  private cargarFases(): void {
    this.maestra.getConceptos('FAS_PRY')
      .pipe(map(lista => lista as unknown as FaseOpt[]))
      .subscribe({
        next: opts => this.fasesOpts.set(opts),
        error: () => this.toast('warn', 'Advertencia', 'No se cargaron las fases.'),
      });
  }

  cargarEntregables(): void {
    this.cargandoEntregables.set(true);
    this.svc.getEntregables()
      .pipe(finalize(() => this.cargandoEntregables.set(false)))
      .subscribe({
        next: e => this.entregables.set(e),
        error: () => this.toast('error', 'Error', 'No se pudieron cargar los entregables.'),
      });
  }

  abrirNuevoEntregable(): void {
    this.entregableEnEdicion.set(null);
    this.formEntregable.reset({ esEntregableFisico: false, tamanioMaximoMb: 0 });
    this.modalEntregable.set(true);
  }

  editarEntregable(e: CatalogoEntregableResponse, event: Event): void {
    event.stopPropagation();
    this.entregableEnEdicion.set(e);
    this.formEntregable.patchValue({
      nombre: e.nombre,
      abreviatura: e.abreviatura,
      codFase: e.codFase,
      esEntregableFisico: e.esEntregableFisico,
      extensionesPermitidas: e.extensionesPermitidas,
      tamanioMaximoMb: e.tamanioMaximoMb,
    });
    this.modalEntregable.set(true);
  }

  guardarEntregable(): void {
    if (this.formEntregable.invalid) {
      this.formEntregable.markAllAsTouched();
      return;
    }
    this.guardandoEntregable.set(true);

    const raw: CatalogoEntregableRequest = this.formEntregable.getRawValue();
    const enEdicion = this.entregableEnEdicion();

    const observer = {
      next: () => {
        this.toast(
          'success',
          enEdicion ? 'Actualizado' : 'Creado',
          'Entregable guardado correctamente.'
        );
        this.modalEntregable.set(false);
        this.cargarEntregables();
      },
      error: (err: any) =>
        this.toast(
          'error',
          'Error al guardar',
          err.error?.mensaje ?? 'No se pudo guardar el entregable.'
        ),
    };

    if (enEdicion) {
      this.svc.updateEntregable(enEdicion.id, raw)
        .pipe(finalize(() => this.guardandoEntregable.set(false)))
        .subscribe(observer);
    } else {
      this.svc.createEntregable(raw)
        .pipe(finalize(() => this.guardandoEntregable.set(false)))
        .subscribe(observer);
    }
  }

  eliminarEntregable(e: CatalogoEntregableResponse, event: Event): void {
    event.stopPropagation();

    this.actionService.ejecutar({
      header: 'Confirmar baja lógica',
      message: `¿Dar de baja el entregable "<b>${e.nombre}</b>"? La acción es reversible.`,
      icon: 'pi pi-exclamation-triangle',
      acceptClass: 'p-button-danger p-button-sm',
      action: () => this.svc.deleteEntregable(e.id),
      onSuccess: () => this.cargarEntregables(),
    });
  }

  // ── Clonación ─────────────────────────────────────────────────────────────

  abrirModalClonar(): void {
    this.contratoOrigenSeleccionado.set(null);
    this.clonaindoCatalogo.set(false);
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

    this.clonaindoCatalogo.set(true);
    this.svc.clonarCatalogo(idOrigen)
      .pipe(finalize(() => this.clonaindoCatalogo.set(false)))
      .subscribe({
        next: () => {
          this.toast(
            'success',
            'Clonación exitosa',
            'El catálogo se clonó correctamente.'
          );
          this.modalClonar.set(false);
          this.cargarEntregables();
        },
        error: (err: any) =>
          this.toast(
            'error',
            'Error al clonar',
            err.error?.mensaje ?? 'No se pudo clonar el catálogo.'
          ),
      });
  }

  // ── Privados ──────────────────────────────────────────────────────────────

  private toast(severity: string, summary: string, detail: string): void {
    this.msg.add({ severity, summary, detail, life: 4000 });
  }

  getNombreFase(codFase: string | number): string {
    const fase = this.fasesOpts().find(f => `${f.id}` === `${codFase}`);
    return fase ? fase.nombre : `${codFase}`;
  }
}
