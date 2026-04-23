import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs';
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
import { ProgressSpinner } from 'primeng/progressspinner';
import { Dialog } from 'primeng/dialog';

import { EstimacionesService, CONTRATO_ACTIVO_ID } from '../../services/estimaciones.service';
import {
  CodigoEstimacion,
  EstadoEstimacion,
  EstimacionActualizacionRequestDTO,
  EstimacionDTO,
  EstimacionFaseDTO,
  EstimacionRequestDTO,
  FaseMaestraDTO,
  ModificadorTarifaDTO,
} from '../../models/estimaciones.models';

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
    ProgressSpinner,
    Dialog,
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

  private readonly _codigosFasesOrdenados = signal<string[]>([]);
  readonly fasesOpciones = signal<{value: string, label: string}[]>([]);

  readonly opcionesModificadorTarifa = computed(() =>
    this.modificadoresTarifa().map(m => ({ value: m.id, label: `${m.descripcion} (${m.porcentaje.toFixed(2)}%)` }))
  );

  // ── Dialog de detalle de fases ───────────────────────────────────────
  readonly mostrarDetalleDialog = signal(false);
  readonly fasesDetalleDialog   = signal<EstimacionFaseDTO[]>([]);
  readonly tituloDialog         = signal('');
  readonly cargandoDetalle      = signal(false);

  readonly cargandoEdicion = signal(false);

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
  // "Activa" = en borrador o aprobada; EST_REC no bloquea la creación de una nueva estimación del mismo tipo
  private readonly _tieneAnaActiva   = computed(() => this.estimaciones().some(e => e.codigoEstimacion === 'EST-ANA' && (e.codEstado === 'EST_BOR' || e.codEstado === 'EST_APR')));
  private readonly _tieneDisActiva   = computed(() => this.estimaciones().some(e => e.codigoEstimacion === 'EST-DIS' && (e.codEstado === 'EST_BOR' || e.codEstado === 'EST_APR')));

  readonly alertaBorrador  = computed(() => this._hayBorrador());
  readonly btnRegistrarINI = computed(() => !this._hayBorrador() && !this._tieneIniAprobada());
  readonly btnRFC          = computed(() => this._tieneIniAprobada());
  readonly btnAnalisis     = computed(() => !this._hayBorrador() && this._tieneIniAprobada() && !this._tieneRFC() && !this._tieneAnaActiva());
  readonly btnDiseno       = computed(() => !this._hayBorrador() && this._tieneIniAprobada() && !this._tieneRFC() && !this._tieneDisActiva());

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
    idModificadorTarifa: [null as number | null],
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
    this.estimaciones.set([]);
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
        next: (res) => {
          // 1. Creamos la opción sintética para la UX
          const opcionPorDefecto = {
            id: null,
            descripcion: 'Tarifa Base (Sin modificador)',
            porcentaje: 0
            // Agrega aquí cualquier otra propiedad obligatoria de tu ModificadorTarifaDTO
          } as ModificadorTarifaDTO; // Casteamos para que TypeScript no se queje si 'id' no admite null por defecto

          // 2. Combinamos la opción sintética (primero) con los datos del backend
          const listaActualizada = [opcionPorDefecto, ...res.data];

          // 3. Actualizamos tu Signal
          this.modificadoresTarifa.set(listaActualizada);
        },
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
          this._codigosFasesOrdenados.set(fases.map(f => f.id));
          this.fasesOpciones.set(fases.map(f => ({
          value: f.id,
          label: `${f.nombre} (${f.id})`,
        })));
        },
        error: () => this.toastError('No se pudo cargar las fases del proyecto.'),
      });
  }

  // ── Dialog de detalle de fases ───────────────────────────────────────
  verDetalle(est: EstimacionDTO): void {
    this.tituloDialog.set(`Fases — ${est.codigoEstimacionDescripcion}`);
    this.fasesDetalleDialog.set([]);
    this.cargandoDetalle.set(true);
    this.mostrarDetalleDialog.set(true);
    this.service.getFasesByEstimacion(est.id)
      .pipe(take(1))
      .subscribe({
        next: res => {
          this.fasesDetalleDialog.set(res.data);
          this.cargandoDetalle.set(false);
        },
        error: () => {
          this.cargandoDetalle.set(false);
          this.toastError('No se pudo cargar las fases de la estimación.');
        },
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

    this.cargandoEdicion.set(true);
    this.service.getFasesByEstimacion(est.id)
      .pipe(take(1))
      .subscribe({
        next: res => {
          this.fasesArray.clear();
          res.data
            .forEach(f => this.fasesArray.push(this.buildFaseGroup({
              codFase:         f.codFase,
              horasEstimadas:  f.horasEstimadas,
              fechaInicioPlan: new Date(f.fechaInicioPlan + 'T00:00:00'),
              fechaFinPlan:    new Date(f.fechaFinPlan    + 'T00:00:00'),
            })));
          this.cargandoEdicion.set(false);
          this.vistaActual.set('formulario');
        },
        error: () => {
          this.cargandoEdicion.set(false);
          this.toastError('No se pudo cargar las fases para edición.');
        },
      });
  }

  clonarEstimacion(est: EstimacionDTO): void {
    this.modoEdicion.set('POST');
    this.codigoEnCurso.set(est.codigoEstimacion);
    this.idEstimacionEdit.set(null);
    this.panelRechazoVisible.set(false);
    this.resetForm();

    this.mainForm.patchValue({
      idModificadorTarifa: est.idModificadorTarifa,
      fechaEstimacion:    new Date(),
      comentario:          '',
    });

    this.cargandoEdicion.set(true);
    this.service.getFasesByEstimacion(est.id)
      .pipe(take(1))
      .subscribe({
        next: res => {
          this.fasesArray.clear();
          res.data
            .forEach(f => this.fasesArray.push(this.buildFaseGroup({
              codFase:         f.codFase,
              horasEstimadas:  f.horasEstimadas,
              fechaInicioPlan: new Date(f.fechaInicioPlan + 'T00:00:00'),
              fechaFinPlan:    new Date(f.fechaFinPlan    + 'T00:00:00'),
            })));
          this.cargandoEdicion.set(false);
          this.vistaActual.set('formulario');
        },
        error: () => {
          this.cargandoEdicion.set(false);
          this.toastError('No se pudo cargar las fases para clonar.');
        },
      });
  }

  cancelar(): void {
    this.resetForm();
    this.vistaActual.set('lectura');
  }

  // ── Guardar ───────────────────────────────────────────────────────────
guardar(): void {
    if (this.mainForm.invalid) {
      this.mainForm.markAllAsTouched();
      this.toastError('Faltan campos requeridos. Revise las fechas y horas de todas las fases.');
      return;
    }

    const v = this.mainForm.getRawValue() as {
      idModificadorTarifa: number | null;
      fechaEstimacion: Date;
      comentario: string;
      fases: { codFase: string; horasEstimadas: number; fechaInicioPlan: Date; fechaFinPlan: Date }[];
    };

    const fasesFormateadas = v.fases.map(f => ({
      codFase:         f.codFase,
      horasEstimadas:  f.horasEstimadas ?? 0,
      fechaInicioPlan: this.toDateStr(f.fechaInicioPlan),
      fechaFinPlan:    this.toDateStr(f.fechaFinPlan),
    }));

    this.guardando.set(true);

    if (this.modoEdicion() === 'POST') {
      const payload: EstimacionRequestDTO = {
        idRequerimiento:     this.idRequerimiento,
        codigoEstimacion:    this.codigoEnCurso(),
        // Quitamos el "!" para que el null de la Tarifa Base pase limpiamente
        idModificadorTarifa: v.idModificadorTarifa,
        fechaEstimacion:     this.toDateStr(v.fechaEstimacion),
        comentario:          v.comentario ?? '',
        fases:               fasesFormateadas,
      };

      this.service.crear(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: res => {
            this.guardando.set(false);
            this.vistaActual.set('lectura');
            this.msg.add({ key: 'est', severity: 'success', summary: 'Guardado', detail: res.mensaje || 'Estimación creada', life: 3000 });
            this.finalizarGuardado();
          },
          // Extraemos el mensaje real del backend (soporta 'mensaje' o 'message')
          error: err => {
            this.guardando.set(false);
            const msg = err.error?.error || err.error?.mensaje || 'No se pudo guardar la estimación.';
            this.toastError(msg);
          },
        });
    } else {
      const idEditado = this.idEstimacionEdit()!;
      const payload: EstimacionActualizacionRequestDTO = {
        idModificadorTarifa: v.idModificadorTarifa,
        fechaEstimacion:     this.toDateStr(v.fechaEstimacion),
        comentario:          v.comentario ?? '',
        fases:               fasesFormateadas,
      };

      this.service.actualizar(idEditado, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: res => {
            this.guardando.set(false);
            this.vistaActual.set('lectura');
            this.msg.add({ key: 'est', severity: 'success', summary: 'Actualizado', detail: res.mensaje || 'Estimación actualizada', life: 3000 });
            this.finalizarGuardado();
          },
          // Extraemos el mensaje real del backend
          error: err => {
            this.guardando.set(false);
            const msg = err.error?.error || err.error?.mensaje || 'No se pudo guardar la estimación.';
            this.toastError(msg);
          },
        });
    }
  }


  // guardar(): void {
  //   if (this.mainForm.invalid) {
  //     this.mainForm.markAllAsTouched();
  //     this.toastError('Faltan campos requeridos. Revise las fechas y horas de todas las fases.');
  //     return;
  //   }

  //   const v = this.mainForm.getRawValue() as {
  //     idModificadorTarifa: number | null;
  //     fechaEstimacion: Date;
  //     comentario: string;
  //     fases: { codFase: string; horasEstimadas: number; fechaInicioPlan: Date; fechaFinPlan: Date }[];
  //   };

  //   const fasesFormateadas = v.fases.map(f => ({
  //     codFase:         f.codFase,
  //     horasEstimadas:  f.horasEstimadas ?? 0,
  //     fechaInicioPlan: this.toDateStr(f.fechaInicioPlan),
  //     fechaFinPlan:    this.toDateStr(f.fechaFinPlan),
  //   }));

  //   this.guardando.set(true);

  //   if (this.modoEdicion() === 'POST') {
  //     const payload: EstimacionRequestDTO = {
  //       idRequerimiento:     this.idRequerimiento,
  //       codigoEstimacion:    this.codigoEnCurso(),
  //       idModificadorTarifa: v.idModificadorTarifa!,
  //       fechaEstimacion:     this.toDateStr(v.fechaEstimacion),
  //       comentario:          v.comentario ?? '',
  //       fases:               fasesFormateadas,
  //     };
  //     this.service.crear(payload)
  //       .pipe(takeUntilDestroyed(this.destroyRef))
  //       .subscribe({
  //         next: res => {
  //           this.guardando.set(false);
  //           this.vistaActual.set('lectura');
  //           this.msg.add({ key: 'est', severity: 'success', summary: 'Guardado', detail: res.mensaje, life: 3000 });
  //           //this.cargarEstimaciones();
  //           this.finalizarGuardado();
  //         },
  //         error: err => { this.guardando.set(false); this.toastError(err.error?.mensaje ?? 'No se pudo guardar la estimación.'); },
  //       });
  //   } else {
  //     const idEditado = this.idEstimacionEdit()!;
  //     const payload: EstimacionActualizacionRequestDTO = {
  //       idModificadorTarifa: v.idModificadorTarifa,
  //       fechaEstimacion:     this.toDateStr(v.fechaEstimacion),
  //       comentario:          v.comentario ?? '',
  //       fases:               fasesFormateadas,
  //     };
  //     this.service.actualizar(idEditado, payload)
  //       .pipe(takeUntilDestroyed(this.destroyRef))
  //       .subscribe({
  //         next: res => {
  //           this.guardando.set(false);
  //           this.vistaActual.set('lectura');
  //           this.msg.add({ key: 'est', severity: 'success', summary: 'Actualizado', detail: res.mensaje, life: 3000 });
  //           //this.cargarEstimaciones();
  //           this.finalizarGuardado();
  //         },
  //         error: err => { this.guardando.set(false); this.toastError(err.error?.mensaje ?? 'No se pudo actualizar la estimación.'); },
  //       });
  //   }
  // }

  private finalizarGuardado(): void {
    this.guardando.set(false);
    this.vistaActual.set('lectura'); // Regresamos a la tabla

    this.cargarEstimaciones();

    // setTimeout(() => {
    //   this.cargarEstimaciones();
    // }, 2500);
  }


  // ── Aprobar ───────────────────────────────────────────────────────────
  aprobar(id: number): void {
    this.service.aprobar(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.msg.add({ key: 'est', severity: 'success', summary: 'Aprobada', detail: res.mensaje, life: 3000 });
        //this.cargarEstimaciones();
        this.finalizarGuardado();
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
          //this.cargarEstimaciones();
          this.finalizarGuardado();
        },
        error: err => { this.rechazando.set(false); this.toastError(err.error?.mensaje ?? 'No se pudo rechazar.'); },
      });
  }

  // ── Anular ────────────────────────────────────────────────────────────
  anular(id: number): void {
    this.service.eliminar(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.msg.add({ key: 'est', severity: 'success', summary: 'Anulada', detail: res.mensaje, life: 3000 });
        //this.cargarEstimaciones();
        this.finalizarGuardado();
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
