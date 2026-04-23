import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, take } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { Toast } from 'primeng/toast';
import { Dialog } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinner } from 'primeng/progressspinner';
import { FileUpload } from 'primeng/fileupload';
import { TimelineModule } from 'primeng/timeline';
import { Accordion, AccordionPanel, AccordionHeader, AccordionContent } from 'primeng/accordion';
import { TagModule } from 'primeng/tag';

import { EntregablesService } from '../../services/entregables.service';
import { EstimacionesService } from '../../services/estimaciones.service';
import {
  ArchivoAdjuntoDTO,
  CatalogoEntregableDTO,
  EntregableGridDTO,
  EvaluacionRequest,
  FlujoBitacoraDTO,
  NuevaVersionRequest,
  RegistroEntregableRequest,
  RequerimientoFaseDTO,
} from '../../models/entregables.models';
import { EstimacionDTO } from '../../models/estimaciones.models';

interface FileSelectEvent {
  currentFiles: File[];
}

@Component({
  selector: 'app-entregables-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    TableModule,
    Select,
    DatePicker,
    InputNumber,
    Textarea,
    Toast,
    Dialog,
    TooltipModule,
    ProgressSpinner,
    FileUpload,
    TimelineModule,
    Accordion,
    AccordionPanel,
    AccordionHeader,
    AccordionContent,
    TagModule,
  ],
  providers: [MessageService],
  templateUrl: './entregables-panel.html',
  styleUrl: './entregables-panel.scss',
})
export class EntregablesPanelComponent implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly service    = inject(EntregablesService);
  private readonly estService = inject(EstimacionesService);
  private readonly fb         = inject(FormBuilder);
  private readonly msg        = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  private idRequerimiento = 0;

  // ── Fases ─────────────────────────────────────────────────────────────
  readonly fases           = signal<RequerimientoFaseDTO[]>([]);
  readonly cargandoFases   = signal(false);

  // ── Entregables por fase ──────────────────────────────────────────────
  readonly entregablesPorFase = signal<Record<number, EntregableGridDTO[]>>({});
  readonly cargandoPorFase    = signal<Record<number, boolean>>({});
  private readonly fasesYaCargadas = new Set<number>();

  // ── Estimaciones (para validación de horas) ───────────────────────────
  readonly estimaciones = signal<EstimacionDTO[]>([]);

  // ── Permiso simulado (JWT: APROBAR_ENTREGABLES) ───────────────────────
  readonly puedeAprobar = signal(true);

  // ── Modal: Nuevo Entregable ───────────────────────────────────────────
  readonly dialogNuevoVisible  = signal(false);
  readonly faseParaNuevo       = signal<RequerimientoFaseDTO | null>(null);
  readonly catalogoFase        = signal<CatalogoEntregableDTO[]>([]);
  readonly cargandoCatalogo    = signal(false);
  readonly guardandoEntregable = signal(false);
  archivoNuevo: File | null = null;

  readonly nuevoForm: FormGroup = this.fb.group({
    idCatalogoEntregable: [null as number | null, Validators.required],
    idEstimacion:         [null as number | null, Validators.required],
    horasFacturables:     [0, [Validators.required, Validators.min(0.01)]],
    fechaEntregaPlan:     [null as Date | null,    Validators.required],
    fechaAprobacionPlan:  [null as Date | null,    Validators.required],
  });

  readonly totalPendientes = computed(() =>
    this.fases().reduce((acc, f) => acc + (f.cantEnRevision || 0), 0)
  );

  readonly opcionesCatalogo = computed(() =>
    this.catalogoFase().map(c => ({ value: c.id, label: c.nombre }))
  );

  readonly opcionesEstimaciones = computed(() =>
    this.estimaciones()
      .filter(e => e.codEstado === 'EST_APR')
      .map(e => ({ value: e.id, label: `${e.codigoEstimacionDescripcion} (${e.horasEstimadas.toFixed(0)}h)` }))
  );

  // ── Modal: Evaluación ─────────────────────────────────────────────────
  readonly dialogEvalVisible = signal(false);
  readonly entregableEval    = signal<EntregableGridDTO | null>(null);
  readonly modoEval          = signal<'aprobar' | 'observar'>('aprobar');
  readonly guardandoEval     = signal(false);
  private archivosEval: File[] = [];
  readonly comentarioCtrl    = new FormControl('', { nonNullable: true, validators: Validators.required });

  // ── Modal: Bitácora ───────────────────────────────────────────────────
  readonly dialogBitacoraVisible  = signal(false);
  readonly flujo                  = signal<FlujoBitacoraDTO[]>([]);
  readonly cargandoBitacora       = signal(false);
  readonly tituloDialogBitacora   = signal('');

  // ── Modal: Nueva Versión ──────────────────────────────────────────────
  readonly dialogVersionVisible = signal(false);
  readonly entregableVersion    = signal<EntregableGridDTO | null>(null);
  readonly guardandoVersion     = signal(false);
  archivoVersion: File | null = null;

  // ── Ciclo de vida ─────────────────────────────────────────────────────
  ngOnInit(): void {
    this.idRequerimiento = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarFases();
    this.cargarEstimaciones();
  }

  volverALista(): void {
    this.router.navigate(['/requerimientos']);
  }

  // ── Carga de datos ────────────────────────────────────────────────────
  cargarFases(): void {
    this.cargandoFases.set(true);
    this.service.getFasesByRequerimiento(this.idRequerimiento)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.fases.set(res.data);
          this.cargandoFases.set(false);
          res.data.forEach(f => this.cargarEntregablesDeFase(f.id));
        },
        error: () => {
          this.cargandoFases.set(false);
          this.toastError('No se pudieron cargar las fases del requerimiento.');
        },
      });
  }

  private cargarEstimaciones(): void {
    this.estService.getByRequerimiento(this.idRequerimiento)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: res => this.estimaciones.set(res.data) });
  }

  cargarEntregablesDeFase(idFase: number): void {
    if (this.fasesYaCargadas.has(idFase)) return;
    this.fasesYaCargadas.add(idFase);
    this.cargandoPorFase.update(prev => ({ ...prev, [idFase]: true }));
    this.service.getEntregablesByFase(idFase)
      .pipe(take(1))
      .subscribe({
        next: res => {
          this.entregablesPorFase.update(prev => ({ ...prev, [idFase]: res.data }));
          this.cargandoPorFase.update(prev => ({ ...prev, [idFase]: false }));
        },
        error: () => {
          this.cargandoPorFase.update(prev => ({ ...prev, [idFase]: false }));
          this.toastError('No se pudieron cargar los entregables.');
        },
      });
  }

  // ── Modal: Nuevo Entregable ───────────────────────────────────────────
  abrirNuevo(fase: RequerimientoFaseDTO): void {
    this.faseParaNuevo.set(fase);
    this.nuevoForm.reset({ idCatalogoEntregable: null, idEstimacion: null, horasFacturables: 0, fechaEntregaPlan: null, fechaAprobacionPlan: null });
    this.catalogoFase.set([]);
    this.cargandoCatalogo.set(true);
    this.service.getCatalogoByFase(fase.codFase)
      .pipe(take(1))
      .subscribe({
        next: res => { this.catalogoFase.set(res.data); this.cargandoCatalogo.set(false); },
        error: () => { this.cargandoCatalogo.set(false); this.toastError('No se pudo cargar el catálogo de entregables.'); },
      });
    this.dialogNuevoVisible.set(true);
  }

  guardarEntregable(): void {
    if (this.nuevoForm.invalid) { this.nuevoForm.markAllAsTouched(); return; }

    const v = this.nuevoForm.getRawValue() as {
      idCatalogoEntregable: number;
      idEstimacion: number;
      horasFacturables: number;
      fechaEntregaPlan: Date;
      fechaAprobacionPlan: Date;
    };

    const fase = this.faseParaNuevo()!;
    const existentes = this.entregablesPorFase()[fase.id] ?? [];
    const horasExistentes = existentes.reduce((acc, e) => acc + e.horasFacturables, 0);
    const estimacion = (this.estimaciones() || []).find(e => e.id === v.idEstimacion);
    if (estimacion) {
      const faseEst = (estimacion.fases || []).find(f => f.codFase === fase.codFase);
      if (faseEst && (horasExistentes + v.horasFacturables) > faseEst.horasEstimadas) {
        this.toastError(
          `Las horas facturables (${(horasExistentes + v.horasFacturables).toFixed(2)}h) superan las estimadas para la fase "${fase.faseDescripcion}" (${faseEst.horasEstimadas.toFixed(2)}h).`
        );
        return;
      }
    }

    this.guardandoEntregable.set(true);
    const payload: RegistroEntregableRequest = {
      idRequerimientoFase:  fase.id,
      idCatalogoEntregable: v.idCatalogoEntregable,
      idEstimacion:         v.idEstimacion,
      horasFacturables:     v.horasFacturables,
      fechaEntregaPlan:     this.toDateStr(v.fechaEntregaPlan),
      fechaAprobacionPlan:  this.toDateStr(v.fechaAprobacionPlan),
    };
    this.service.registrar(payload).pipe(take(1)).subscribe({
      next: () => {
        this.guardandoEntregable.set(false);
        this.dialogNuevoVisible.set(false);
        this.msg.add({ key: 'ent', severity: 'success', summary: 'Planificado', detail: 'Entregable registrado. Suba el archivo cuando esté listo.', life: 4000 });
        this.recargarFase(fase.id);
        this.cargarFases();
      },
      error: err => {
        this.guardandoEntregable.set(false);
        this.toastError(err.error?.error || err.error?.mensaje || 'No se pudo registrar el entregable.');
      },
    });
  }

  // ── Modal: Evaluación ─────────────────────────────────────────────────
  abrirEvaluacion(ent: EntregableGridDTO, modo: 'aprobar' | 'observar'): void {
    this.entregableEval.set(ent);
    this.modoEval.set(modo);
    this.comentarioCtrl.reset('');
    this.archivosEval = [];
    this.dialogEvalVisible.set(true);
  }

  onArchivosEvalSeleccionados(event: FileSelectEvent): void {
    this.archivosEval = event.currentFiles;
  }

  guardarEvaluacion(): void {
    if (this.comentarioCtrl.invalid) { this.comentarioCtrl.markAsTouched(); return; }

    const idEnt    = this.entregableEval()!.id;
    const modo     = this.modoEval();
    const codEstado = modo === 'aprobar' ? 'ENT_APR' : 'ENT_OBS';
    const comentario = this.comentarioCtrl.value;

    this.guardandoEval.set(true);

    const doEvaluar = (adjuntos: ArchivoAdjuntoDTO[] = []) => {
      const payload: EvaluacionRequest = {
        codEstado,
        comentarioResumen: comentario,
        ...(adjuntos.length ? { archivosAdjuntos: adjuntos } : {}),
      };
      this.service.evaluar(idEnt, payload).pipe(take(1)).subscribe({
        next: () => {
          this.guardandoEval.set(false);
          this.dialogEvalVisible.set(false);
          this.msg.add({
            key: 'ent', severity: 'success',
            summary: modo === 'aprobar' ? 'Aprobado' : 'Observado',
            detail: 'Evaluación registrada correctamente.', life: 3000,
          });
          this.recargarTodasLasFases();
          this.cargarFases();
        },
        error: err => {
          this.guardandoEval.set(false);
          this.toastError(err.error?.mensaje || 'No se pudo registrar la evaluación.');
        },
      });
    };

    if (modo === 'observar' && this.archivosEval.length > 0) {
      forkJoin(
        this.archivosEval.map(f =>
          this.service.uploadArchivo(this.idRequerimiento, f, 'feedback').pipe(take(1))
        )
      ).subscribe({
        next: responses => {
          const adjuntos: ArchivoAdjuntoDTO[] = responses.map(r => ({
            nombreArchivo: r.data.nombreArchivoOriginal,
            rutaArchivo:   r.data.rutaFileServer,
          }));
          doEvaluar(adjuntos);
        },
        error: () => {
          this.guardandoEval.set(false);
          this.toastError('No se pudieron subir los archivos de evidencia.');
        },
      });
    } else {
      doEvaluar();
    }
  }

  // ── Modal: Bitácora ───────────────────────────────────────────────────
  verBitacora(ent: EntregableGridDTO): void {
    this.tituloDialogBitacora.set(`Bitácora — ${ent.nombreEntregable}`);
    this.flujo.set([]);
    this.cargandoBitacora.set(true);
    this.dialogBitacoraVisible.set(true);
    this.service.getFlujoByEntregable(ent.id).pipe(take(1)).subscribe({
      next: res => { this.flujo.set(res.data); this.cargandoBitacora.set(false); },
      error: () => { this.cargandoBitacora.set(false); this.toastError('No se pudo cargar la bitácora.'); },
    });
  }

  // ── Modal: Nueva Versión ──────────────────────────────────────────────
  abrirNuevaVersion(ent: EntregableGridDTO): void {
    this.entregableVersion.set(ent);
    this.archivoVersion = null;
    this.dialogVersionVisible.set(true);
  }

  onArchivoVersionSeleccionado(event: FileSelectEvent): void {
    this.archivoVersion = event.currentFiles[0] ?? null;
  }

  guardarNuevaVersion(): void {
    if (!this.archivoVersion) { this.toastError('Debe seleccionar un archivo.'); return; }

    const ent = this.entregableVersion()!;
    this.guardandoVersion.set(true);
    this.service.uploadArchivo(this.idRequerimiento, this.archivoVersion, 'entregables')
      .pipe(take(1))
      .subscribe({
        next: uploadRes => {
          const payload: NuevaVersionRequest = {
            nombreArchivo:  uploadRes.data.nombreArchivoOriginal,
            rutaFileServer: uploadRes.data.rutaFileServer,
            tamanioKb:      uploadRes.data.tamanioKb,
          };
          this.service.subirNuevaVersion(ent.id, payload).pipe(take(1)).subscribe({
            next: () => {
              this.guardandoVersion.set(false);
              this.dialogVersionVisible.set(false);
              this.msg.add({ key: 'ent', severity: 'success', summary: 'Nueva versión', detail: 'Versión registrada correctamente.', life: 3000 });
              const idFase = this.getFaseDeEntregable(ent.id);
              if (idFase !== null) this.recargarFase(idFase);
              this.cargarFases();
            },
            error: err => {
              this.guardandoVersion.set(false);
              this.toastError(err.error?.mensaje || 'No se pudo registrar la nueva versión.');
            },
          });
        },
        error: err => {
          this.guardandoVersion.set(false);
          this.toastError(err.error?.mensaje || 'No se pudo subir el archivo.');
        },
      });
  }

  // ── Descarga de archivos ──────────────────────────────────────────────
  descargarArchivo(ruta: string, nombre: string): void {
    this.service.downloadArchivo(ruta, nombre).pipe(take(1)).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = nombre;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.toastError('No se pudo descargar el archivo.'),
    });
  }

  // ── Helpers de UI ─────────────────────────────────────────────────────
  getBadgeEntregable(codEstado: string): string {
    const map: Record<string, string> = {
      ENT_PEN: 'badge-secondary',
      ENT_REV: 'badge-warn',
      ENT_APR: 'badge-success',
      ENT_OBS: 'badge-danger',
    };
    return map[codEstado] ?? 'badge-secondary';
  }

  getIconoFlujo(codEstado: string): string {
    const map: Record<string, string> = {
      ENT_REV: 'pi pi-send',
      ENT_APR: 'pi pi-check-circle',
      ENT_OBS: 'pi pi-times-circle',
    };
    return map[codEstado] ?? 'pi pi-circle';
  }

  getColorFlujo(codEstado: string): string {
    const map: Record<string, string> = {
      ENT_REV: '#d97706',
      ENT_APR: '#166534',
      ENT_OBS: '#b91c1c',
    };
    return map[codEstado] ?? '#64748b';
  }

  // ── Privados ──────────────────────────────────────────────────────────
  private recargarFase(idFase: number): void {
    this.fasesYaCargadas.delete(idFase);
    this.entregablesPorFase.update(prev => ({ ...prev, [idFase]: [] }));
    this.cargarEntregablesDeFase(idFase);
  }

  private recargarTodasLasFases(): void {
    this.fasesYaCargadas.clear();
    this.entregablesPorFase.set({});
    this.fases().forEach(f => this.cargarEntregablesDeFase(f.id));
  }

  private getFaseDeEntregable(idEntregable: number): number | null {
    for (const [idFase, lista] of Object.entries(this.entregablesPorFase())) {
      if (lista.some(e => e.id === idEntregable)) return Number(idFase);
    }
    return null;
  }

  private validarArchivo(file: File, cat: CatalogoEntregableDTO): boolean {
    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
    const permitidas = cat.extensionesPermitidas.split(',').map(e => e.trim().toLowerCase());
    if (!permitidas.includes(ext)) {
      this.toastError(`Extensión no permitida. Tipos aceptados: ${cat.extensionesPermitidas}`);
      return false;
    }
    if (file.size > cat.tamanioMaximoMb * 1024 * 1024) {
      this.toastError(`El archivo supera el tamaño máximo de ${cat.tamanioMaximoMb} MB.`);
      return false;
    }
    return true;
  }

  private toDateStr(d: Date): string {
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  }

  private toastError(detail: string): void {
    this.msg.add({ key: 'ent', severity: 'error', summary: 'Error', detail, life: 5000 });
  }
}
