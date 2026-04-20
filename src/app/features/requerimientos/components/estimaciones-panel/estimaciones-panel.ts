import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Toast } from 'primeng/toast';
import { Message } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';

import { EstimacionesService, CONTRATO_ACTIVO_ID } from '../../services/estimaciones.service';
import {
  CodigoEstimacion,
  EstadoEstimacion,
  EstimacionDTO,
  EstimacionRequestDTO,
  FaseMaestraDTO,
  ModificadorTarifaDTO,
} from '../../models/estimaciones.models';

const FASE_PESO: Record<string, number> = {
  FAS_INI: 1, FAS_ANA: 2, FAS_DIS: 3, FAS_CON: 4, FAS_DES: 5, FAS_PRF: 6, FAS_PRS: 7,
};

const FASE_NOMBRE: Record<string, string> = {
  FAS_INI: 'Iniciación',
  FAS_ANA: 'Análisis',
  FAS_DIS: 'Diseño',
  FAS_CON: 'Construcción',
  FAS_DES: 'Desarrollo',
  FAS_PRF: 'Pruebas Funcionales',
  FAS_PRS: 'Pruebas de Sistema',
};

const FASES_MAESTRAS_ORDENADAS = Object.entries(FASE_PESO)
  .sort(([, a], [, b]) => a - b)
  .map(([cod]) => cod);

@Component({
  selector: 'app-estimaciones-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    TableModule,
    Select,
    DatePicker,
    InputNumber,
    InputTextModule,
    Textarea,
    Toast,
    Message,
    TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './estimaciones-panel.html',
  styleUrl: './estimaciones-panel.scss',
})
export class EstimacionesPanelComponent implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly service    = inject(EstimacionesService);
  private readonly fb         = inject(FormBuilder);
  private readonly msg        = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  private idRequerimiento = 0;

  // ── Datos ─────────────────────────────────────────────────────────────
  readonly estimaciones        = signal<EstimacionDTO[]>([]);
  readonly cargando            = signal(false);
  readonly modificadoresTarifa = signal<ModificadorTarifaDTO[]>([]);

  private readonly _codigosFasesOrdenados = signal<string[]>(FASES_MAESTRAS_ORDENADAS);
  readonly fasesOpciones = signal(
    FASES_MAESTRAS_ORDENADAS.map(cod => ({ value: cod, label: `${FASE_NOMBRE[cod] ?? cod}  (${cod})` }))
  );
  readonly opcionesModificadorTarifa = computed(() =>
    this.modificadoresTarifa().map(m => ({ value: m.id, label: `${m.descripcion} (${m.porcentaje.toFixed(2)}%)` }))
  );

  // ── Vista: inline toggle (lectura ↔ formulario) ───────────────────────
  readonly vistaActual     = signal<'lectura' | 'formulario'>('lectura');
  readonly guardando       = signal(false);
  readonly modoEdicion     = signal<'POST' | 'PUT'>('POST');
  readonly codigoEnCurso   = signal<CodigoEstimacion>('EST-INI');
  readonly idEstimacionEdit = signal<number | null>(null);

  // ── Panel de rechazo inline ───────────────────────────────────────────
  readonly panelRechazoVisible = signal(false);
  readonly idEstimacionRechazo = signal<number | null>(null);
  readonly rechazando          = signal(false);
  readonly motivoCtrl          = new FormControl('', { nonNullable: true, validators: Validators.required });

  // ── Máquina de estados (lógica 100% preservada) ───────────────────────
  private readonly _hayBorrador      = computed(() => this.estimaciones().some(e => e.codEstado === 'EST_BOR'));
  private readonly _tieneIniAprobada = computed(() => this.estimaciones().some(e => e.codigoEstimacion === 'EST-INI' && e.codEstado === 'EST_APR'));
  private readonly _tieneRFC         = computed(() => this.estimaciones().some(e => e.codigoEstimacion === 'RFC'));
  private readonly _tieneAna         = computed(() => this.estimaciones().some(e => e.codigoEstimacion === 'EST-ANA'));
  private readonly _tieneDis         = computed(() => this.estimaciones().some(e => e.codigoEstimacion === 'EST-DIS'));

  readonly alertaBorrador  = computed(() => this._hayBorrador());
  readonly btnRegistrarINI = computed(() => !this._hayBorrador() && !this._tieneIniAprobada());
  readonly btnRFC          = computed(() => !this._hayBorrador() && this._tieneIniAprobada());
  readonly btnAnalisis     = computed(() => !this._hayBorrador() && this._tieneIniAprobada() && !this._tieneRFC() && !this._tieneAna());
  readonly btnDiseno       = computed(() => !this._hayBorrador() && this._tieneIniAprobada() && !this._tieneRFC() && !this._tieneDis());

  // ── Computed para cabecera del formulario ─────────────────────────────
  readonly tituloFormulario = computed(() => {
    const labels: Record<CodigoEstimacion, string> = {
      'EST-INI': 'Estimación Inicial',
      'EST-ANA': 'Estimación de Análisis',
      'EST-DIS': 'Estimación de Diseño',
      'RFC':     'Control de Cambios (RFC)',
    };
    return labels[this.codigoEnCurso()];
  });

  readonly badgeCodigoClass = computed(() => {
    const map: Record<CodigoEstimacion, string> = {
      'EST-INI': 'code-ini',
      'EST-ANA': 'code-ana',
      'EST-DIS': 'code-dis',
      'RFC':     'code-rfc',
    };
    return map[this.codigoEnCurso()];
  });

  // ── Formulario (lógica 100% preservada) ──────────────────────────────
  readonly mainForm = this.fb.group({
    idModificadorTarifa: [null as number | null, Validators.required],
    fechaEstimacion:    [null as Date | null,   Validators.required],
    comentario:         [''],
    fases:              this.fb.array([]),
  });

  get fasesArray(): FormArray { return this.mainForm.get('fases') as FormArray; }

  // ── Ciclo de vida ─────────────────────────────────────────────────────
  ngOnInit(): void {
    this.idRequerimiento = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarEstimaciones();
    this.cargarModificadores();
    this.cargarFasesMaestras();
  }

  volverALista(): void {
    this.router.navigate(['/requerimientos']);
  }

  // ── Carga de datos ────────────────────────────────────────────────────
  cargarEstimaciones(): void {
    this.cargando.set(true);

// TODO: Pendiente crear endpoint en Spring Boot
  //this.estimaciones.set([]); // Simulamos historial vacío
  //this.cargando.set(false);

    this.service.getByRequerimiento(this.idRequerimiento)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => { this.estimaciones.set(res.data); this.cargando.set(false); },
        error: () => { this.cargando.set(false); this.toastError('No se pudo cargar el historial de estimaciones.'); },
      });
  }

  private cargarModificadores(): void {
    this.service.getModificadoresTarifa(CONTRATO_ACTIVO_ID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => this.modificadoresTarifa.set(res.data),
        error: () => this.toastError('No se pudo cargar los modificadores de tarifa.'),
      });
  }

  private cargarFasesMaestras(): void {
    this.service.getFasesMaestras()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const fases: FaseMaestraDTO[] = res.data;
          if (!fases.length) return;
          const ordenadas = [...fases].sort(
            (a, b) => (FASE_PESO[a.id] ?? 99) - (FASE_PESO[b.id] ?? 99)
          );
          this._codigosFasesOrdenados.set(ordenadas.map(f => f.id));
          this.fasesOpciones.set(ordenadas.map(f => ({
            value: f.id,
            label: `${f.nombre}  (${f.id})`,
          })));
        },
        error: () => this.toastError('No se pudo cargar las fases del proyecto.'),
      });
  }

  // ── Transiciones de vista ─────────────────────────────────────────────
  abrirCrear(codigo: CodigoEstimacion): void {
    this.modoEdicion.set('POST');
    this.codigoEnCurso.set(codigo);
    this.idEstimacionEdit.set(null);
    this.panelRechazoVisible.set(false);
    this.resetForm();
    if (codigo === 'EST-INI') { this.precargarFasesINI(); }
    this.vistaActual.set('formulario');
  }

  abrirEditar(est: EstimacionDTO): void {
    this.modoEdicion.set('PUT');
    this.codigoEnCurso.set(est.codigoEstimacion);
    this.idEstimacionEdit.set(est.id);
    this.panelRechazoVisible.set(false);
    this.resetForm();

    this.mainForm.patchValue({
      idModificadorTarifa: est.idModificadorTarifa,
      fechaEstimacion:    new Date(est.fechaEstimacion + 'T00:00:00'),
      comentario:          est.comentario,
    });

    [...est.fases]
      .sort((a, b) => (FASE_PESO[a.codFase] ?? 99) - (FASE_PESO[b.codFase] ?? 99))
      .forEach(f => this.fasesArray.push(this.buildFaseGroup({
        codFase:         f.codFase,
        horasEstimadas:  f.horasEstimadas,
        fechaInicioPlan: new Date(f.fechaInicioPlan + 'T00:00:00'),
        fechaFinPlan:    new Date(f.fechaFinPlan + 'T00:00:00'),
      })));

    this.vistaActual.set('formulario');
  }

  cancelar(): void {
    this.resetForm();
    this.vistaActual.set('lectura');
  }

  // ── Guardar (lógica 100% preservada) ──────────────────────────────────
  guardar(): void {
    if (this.mainForm.invalid) {
      this.mainForm.markAllAsTouched();
      this.toastError('Faltan campos requeridos. Revise las fechas y horas de todas las fases.');
      console.log('ESTADO DEL FORMULARIO:', this.mainForm.value); // Para que lo veas en consola
      return;
    }

    const v = this.mainForm.getRawValue() as {
      idModificadorTarifa: number;
      fechaEstimacion: Date;
      comentario: string;
      fases: { codFase: string; horasEstimadas: number; fechaInicioPlan: Date; fechaFinPlan: Date }[];
    };

    const payload: EstimacionRequestDTO = {
      idModificadorTarifa: v.idModificadorTarifa,
      fechaEstimacion:    this.toDateStr(v.fechaEstimacion),
      comentario:          v.comentario ?? '',
      fases: v.fases.map(f => ({
        codFase:         f.codFase,
        horasEstimadas:  f.horasEstimadas ?? 0,
        fechaInicioPlan: this.toDateStr(f.fechaInicioPlan),
        fechaFinPlan:    this.toDateStr(f.fechaFinPlan),
      })),
    };

    if (this.modoEdicion() === 'POST') {
      payload.idRequerimiento  = this.idRequerimiento;
      payload.codigoEstimacion = this.codigoEnCurso();
    }

    this.guardando.set(true);
    const call$ = this.modoEdicion() === 'POST'
      ? this.service.crear(payload)
      : this.service.actualizar(this.idEstimacionEdit()!, payload);

    call$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.guardando.set(false);
        this.vistaActual.set('lectura');
        this.msg.add({ key: 'est', severity: 'success', summary: 'Guardado', detail: res.mensaje, life: 3000 });
        this.cargarEstimaciones();
      },
      error: err => {
        this.guardando.set(false);
        this.toastError(err.error?.mensaje ?? 'No se pudo guardar la estimación.');
      },
    });
  }

  // ── Aprobar ───────────────────────────────────────────────────────────
  aprobar(id: number): void {
    this.service.aprobar(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.msg.add({ key: 'est', severity: 'success', summary: 'Aprobada', detail: res.mensaje, life: 3000 });
        this.cargarEstimaciones();
      },
      error: err => this.toastError(err.error?.mensaje ?? 'No se pudo aprobar.'),
    });
  }

  // ── Rechazo inline ────────────────────────────────────────────────────
  abrirRechazo(id: number): void {
    this.idEstimacionRechazo.set(id);
    this.motivoCtrl.reset();
    this.panelRechazoVisible.set(true);
  }

  cerrarPanelRechazo(): void {
    this.panelRechazoVisible.set(false);
    this.idEstimacionRechazo.set(null);
    this.motivoCtrl.reset();
  }

  confirmarRechazo(): void {
    if (this.motivoCtrl.invalid) { this.motivoCtrl.markAsTouched(); return; }
    this.rechazando.set(true);
    this.service.rechazar(this.idEstimacionRechazo()!, this.motivoCtrl.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.rechazando.set(false);
          this.panelRechazoVisible.set(false);
          this.msg.add({ key: 'est', severity: 'warn', summary: 'Rechazada', detail: res.mensaje, life: 3000 });
          this.cargarEstimaciones();
        },
        error: err => { this.rechazando.set(false); this.toastError(err.error?.mensaje ?? 'No se pudo rechazar.'); },
      });
  }

  // ── Anular ────────────────────────────────────────────────────────────
  anular(id: number): void {
    this.service.eliminar(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.msg.add({ key: 'est', severity: 'success', summary: 'Anulada', detail: res.mensaje, life: 3000 });
        this.cargarEstimaciones();
      },
      error: err => this.toastError(err.error?.mensaje ?? 'No se pudo anular.'),
    });
  }

  // ── Fases ─────────────────────────────────────────────────────────────
  addFase(): void { this.fasesArray.push(this.buildFaseGroup()); }
  removeFase(index: number): void { this.fasesArray.removeAt(index); }

  // ── Badge helpers ─────────────────────────────────────────────────────
  getBadgeClass(cod: EstadoEstimacion): string {
    const map: Record<string, string> = {
      EST_BOR: 'badge-warn', EST_APR: 'badge-success', EST_REC: 'badge-danger', EST_ANU: 'badge-secondary',
    };
    return map[cod] ?? 'badge-secondary';
  }

  // ── Privados ──────────────────────────────────────────────────────────
  private buildFaseGroup(v?: { codFase?: string; horasEstimadas?: number; fechaInicioPlan?: Date | null; fechaFinPlan?: Date | null }): FormGroup {
    return this.fb.group({
      codFase:         [v?.codFase        ?? '',   Validators.required],
      horasEstimadas:  [v?.horasEstimadas ?? 0,    [Validators.required, Validators.min(0)]],
      fechaInicioPlan: [v?.fechaInicioPlan ?? null, Validators.required],
      fechaFinPlan:    [v?.fechaFinPlan   ?? null, Validators.required],
    });
  }

  private precargarFasesINI(): void {
    this.fasesArray.clear();
    this._codigosFasesOrdenados().forEach(cod => this.fasesArray.push(this.buildFaseGroup({ codFase: cod, horasEstimadas: 0 })));
  }

  private resetForm(): void {
    this.fasesArray.clear();
    this.mainForm.reset({ idModificadorTarifa: null, fechaEstimacion: null, comentario: '' });
  }

  private toDateStr(d: Date | string | null | undefined): string {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  }

  private toastError(detail: string): void {
    this.msg.add({ key: 'est', severity: 'error', summary: 'Error', detail, life: 5000 });
  }
}
