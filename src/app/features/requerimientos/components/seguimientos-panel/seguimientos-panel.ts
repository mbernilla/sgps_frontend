import {
  Component,
  computed,
  DestroyRef,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  inject,
  signal,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
// HttpClient eliminado, ya no se usa aquí
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { Textarea } from 'primeng/textarea';
import { Button } from 'primeng/button';
import { Timeline } from 'primeng/timeline';
import { Toast } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService, PrimeTemplate } from 'primeng/api';

import { ActionOrchestratorService } from '../../../../shared/services/action-orchestrator.service';
import { MaestraService } from '../../../../core/services/maestra.service';
import { ConceptoDTO, PersonalDTO } from '../../../../core/models/maestra.model';
import { SeguimientoDTO } from '../../models/requerimientos.models';
import { environment } from '../../../../../environments/environment';

import { SeguimientosService } from '../../services/seguimientos.service';

/** Payload exacto que espera el endpoint POST /v1/seguimientos */
interface SeguimientoCreateDTO {
  idRequerimiento: number;
  codTipoSeguimiento: string;
  descripcion: string;
  fechaReal: string;        // YYYY-MM-DD
  fechaPlazo: string | null; // YYYY-MM-DD
  idPersonalResponsable: number;
  codEstado: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-seguimientos-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    Select,
    DatePicker,
    Textarea,
    Button,
    Timeline,
    Toast,
    ToggleSwitchModule,
    ConfirmDialog,
    PrimeTemplate,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './seguimientos-panel.html',
  styleUrl: './seguimientos-panel.scss',
})
export class SeguimientosPanel implements OnInit, OnChanges {

  @Input({ required: true }) idRequerimiento!: number;
  @Input() idSeguimientoDestacado: number | null = null;

  @Output() onCambio = new EventEmitter<void>();

  // ── Servicios ─────────────────────────────────────────────────────────
  private readonly fb = inject(FormBuilder);
  private readonly maestra = inject(MaestraService);
  private readonly msg = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly actionService = inject(ActionOrchestratorService);

  private readonly seguimientosService = inject(SeguimientosService);

  readonly apiBase = environment.baseUrl;

  // ── Estado de UI ──────────────────────────────────────────────────────
  readonly cargandoHistorial = signal(false);
  readonly guardando = signal(false);

  readonly limpiarUploader = signal(false);
  archivosParaSubir: File[] = [];

  readonly adjuntosExistentes = signal<any[]>([]);
  readonly idsParaEliminar = signal<number[]>([]);

  // ── Opciones de combos (se cargan en ngOnInit) ────────────────────────
  readonly tipoOpts = signal<ConceptoDTO[]>([]);
  readonly personalOpts = signal<PersonalDTO[]>([]);

  // ── Datos del timeline ────────────────────────────────────────────────
  readonly seguimientos = signal<SeguimientoDTO[]>([]);
  readonly mostrarAtendidos = signal<boolean>(false);
  readonly seguimientosFiltrados = computed(() =>
    this.mostrarAtendidos()
      ? this.seguimientos()
      : this.seguimientos().filter(s => s.codEstado === 'SEG_PEN')
  );
  readonly seguimientoEnEdicion = signal<SeguimientoDTO | null>(null);

  // ── Formulario de registro ────────────────────────────────────────────
  readonly form = this.fb.group({
    codTipoSeguimiento: this.fb.nonNullable.control('SEG_NOT', Validators.required),
    idPersonalResponsable: this.fb.control<number | null>(null),
    descripcion: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(500)]),
    fechaReal: this.fb.control<Date | null>(new Date(), Validators.required),
    fechaPlazo: this.fb.control<Date | null>(null),
  });

  readonly mostrarFechasPlazo = toSignal(
    this.form.controls.codTipoSeguimiento.valueChanges.pipe(
      map(val => !!val && val !== 'SEG_NOT'),
    ),
    { initialValue: false },
  );

  readonly mostrarResponsable = toSignal(
    this.form.controls.codTipoSeguimiento.valueChanges.pipe(
      map(val => !!val && val !== 'SEG_NOT'),
    ),
    { initialValue: false },
  );

  // ── Ciclo de vida ─────────────────────────────────────────────────────

  ngOnInit(): void {
    this.cargarMaestras();
    this.suscribirValidacionDinamica();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['idRequerimiento']?.currentValue) {
      this.cargarHistorial();
    }
  }

  // ── Acciones públicas ─────────────────────────────────────────────────

  // Atrapa el archivo real nativo (sin intermediarios que lo vuelvan undefined)
  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        this.archivosParaSubir.push(files[i]);
      }
    }
    // Limpiamos el input para permitir re-seleccionar el mismo archivo si el usuario se arrepiente
    event.target.value = '';
  }

  // Permite quitar un archivo antes de guardar
  removerArchivo(index: number): void {
    this.archivosParaSubir.splice(index, 1);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw      = this.form.getRawValue();
    const editando = this.seguimientoEnEdicion();

    const payload: SeguimientoCreateDTO = {
      idRequerimiento:       this.idRequerimiento,
      codTipoSeguimiento:    raw.codTipoSeguimiento,
      descripcion:           raw.descripcion,
      fechaReal:             this.toDateStr(raw.fechaReal)!,
      fechaPlazo:            this.toDateStr(raw.fechaPlazo),
      idPersonalResponsable: raw.idPersonalResponsable!,
      codEstado:             editando ? editando.codEstado : 'SEG_PEN',
    };

    this.guardando.set(true);

    const request$ = editando
      ? this.seguimientosService.actualizar(editando.id, payload)
      : this.seguimientosService.crear(payload);

    request$.subscribe({
      next: (res: any) => {
        const idSeguimientoGuardado = editando
            ? editando.id
            : (typeof res.data === 'number' ? res.data : (res.data?.id ?? 0));

        // 👇 ORQUESTADOR DE ARCHIVOS (SUBIDAS Y ELIMINACIONES) 👇
        const tareasAsincronas: any[] = [];

        // 1. Encolar subidas de archivos nuevos
        if (this.archivosParaSubir.length > 0 && idSeguimientoGuardado > 0) {
          this.archivosParaSubir.forEach(file => {
            tareasAsincronas.push(this.seguimientosService.uploadAdjuntoGlobal('SEGUIMIENTO', idSeguimientoGuardado, file));
          });
        }

        // 2. Encolar eliminaciones de archivos marcados (solo en edición)
        const idsBorrar = this.idsParaEliminar();
        if (idsBorrar.length > 0) {
          idsBorrar.forEach(idAdjunto => {
            tareasAsincronas.push(this.seguimientosService.eliminarAdjuntoGlobal(idAdjunto));
          });
        }

        // 3. Ejecutar todo en paralelo si hay tareas
        if (tareasAsincronas.length > 0) {
          forkJoin(tareasAsincronas).subscribe({
            next: () => this.finalizarGuardado(editando),
            error: (err) => {
              console.error('[GUARDAR] Error procesando archivos:', err);
              this.msg.add({ severity: 'warn', summary: 'Atención', detail: 'El seguimiento se guardó, pero hubo un problema al sincronizar los archivos.' });
              this.finalizarGuardado(editando);
            }
          });
        } else {
          // Si no hay archivos nuevos ni borrados, finalizamos directo
          this.finalizarGuardado(editando);
        }
      },
      error: (err) => {
        this.msg.add({
          severity: 'error',
          summary:  'Error al guardar',
          detail:   err.error?.mensaje ?? 'No se pudo guardar el seguimiento.',
          life:     5000,
        });
        this.guardando.set(false);
      }
    });
  }

  // 👇 LÓGICA DE CIERRE AGRUPADA PARA NO REPETIR CÓDIGO 👇
  private finalizarGuardado(editando: any): void {
    this.msg.add({
      severity: 'success',
      summary: editando ? 'Actualizado' : 'Registrado',
      detail: editando ? 'El seguimiento fue actualizado correctamente.' : 'El seguimiento fue guardado correctamente.',
      life: 3000,
    });

    // Limpiamos la memoria de los archivos
    this.archivosParaSubir = [];
    this.limpiarUploader.set(!this.limpiarUploader());

    if (editando) {
      this.cancelarEdicion();
    } else {
      this.limpiarManteniendo();
    }

    this.cargarHistorial();
    this.onCambio.emit();
    this.guardando.set(false);
  }

  limpiar(): void {
    this.form.reset({ codTipoSeguimiento: 'SEG_NOT', fechaReal: new Date() });
    this.resetBuffersArchivos();
  }

  private resetBuffersArchivos(): void {
    this.archivosParaSubir = [];
    this.adjuntosExistentes.set([]);
    this.idsParaEliminar.set([]);
  }

  toggleEliminarAdjunto(id: number): void {
    const actuales = this.idsParaEliminar();
    if (actuales.includes(id)) {
      // Si ya estaba marcado, lo "salvamos" (Deshacer)
      this.idsParaEliminar.set(actuales.filter(x => x !== id));
    } else {
      // Lo marcamos para eliminar
      this.idsParaEliminar.set([...actuales, id]);
    }
  }

  editar(seg: SeguimientoDTO): void {
    this.seguimientoEnEdicion.set(seg);
    this.form.patchValue({
      codTipoSeguimiento: seg.codTipoSeguimiento,
      idPersonalResponsable: seg.idPersonalResponsable,
      descripcion: seg.descripcion,
      fechaReal: this.parseDateStr(seg.fechaReal as unknown as string),
      fechaPlazo: this.parseDateStr(seg.fechaPlazo as unknown as string),
    });

    // 👇 CARGAMOS LOS ARCHIVOS EXISTENTES AL BUFFER 👇
    this.adjuntosExistentes.set(seg.archivos ? [...seg.archivos] : []);
    this.idsParaEliminar.set([]); // Limpiamos la papelera temporal
    this.archivosParaSubir = [];  // Limpiamos los nuevos
  }

  cancelarEdicion(): void {
    this.seguimientoEnEdicion.set(null);
    this.form.reset({ fechaReal: new Date() });
    this.resetBuffersArchivos();
  }

  atenderSeguimiento(id: number): void {
    // 👇 USAMOS EL SERVICIO 👇
    this.seguimientosService.actualizarEstado(id, 'SEG_ATE')
      .subscribe({
        next: () => {
          this.msg.add({
            severity: 'success',
            summary: 'Atendido',
            detail: 'El seguimiento fue marcado como atendido.',
            life: 3000,
          });
          this.cargarHistorial();
          this.onCambio.emit();
        },
        error: (err) => {
          this.msg.add({
            severity: 'error',
            summary: 'Error al atender',
            detail: err.error?.mensaje ?? 'No se pudo actualizar el estado.',
            life: 5000,
          });
        },
      });
  }

  eliminarSeguimiento(id: number): void {
    this.actionService.ejecutar({
      header: 'Confirmar eliminación',
      message: '¿Está seguro que desea anular este seguimiento?',
      icon: 'pi pi-exclamation-triangle',
      acceptClass: 'p-button-danger p-button-sm',
      acceptLabel: 'Sí, anular',
      // 👇 USAMOS EL SERVICIO 👇
      action: () => this.seguimientosService.eliminar(id),
      onSuccess: () => {
        this.cargarHistorial();
        this.onCambio.emit();
      }
    });
  }

  // ── Helpers de resolución de catálogo ─────────────────────────────────

  getNombreTipo(cod: string): string {
    return this.tipoOpts().find(t => t.codigo === cod)?.nombre ?? cod;
  }

  getNombreResponsable(id: number): string {
    return this.personalOpts().find(p => p.id === id)?.nombresApellidos ?? 'Desconocido';
  }

  // ── Privados ──────────────────────────────────────────────────────────

  private cargarMaestras(): void {
    forkJoin({
      tipos: this.maestra.getConceptos('TIP_SEG'),
      personal: this.maestra.getPersonal(),
    }).subscribe({
      next: ({ tipos, personal }) => {
        this.tipoOpts.set(tipos);
        this.personalOpts.set(personal);
      },
    });
  }

  private suscribirValidacionDinamica(): void {
    this.form.controls.codTipoSeguimiento.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(tipo => {
        const fechaPlazoCtrl = this.form.controls.fechaPlazo;
        const responsableCtrl = this.form.controls.idPersonalResponsable;

        if (tipo === 'SEG_TAR') {
          fechaPlazoCtrl.addValidators(Validators.required);
          responsableCtrl.addValidators(Validators.required);
          fechaPlazoCtrl.markAsUntouched();
          responsableCtrl.markAsUntouched();
        } else {
          fechaPlazoCtrl.removeValidators(Validators.required);
          responsableCtrl.removeValidators(Validators.required);
          fechaPlazoCtrl.setValue(null, { emitEvent: false });
          responsableCtrl.setValue(null, { emitEvent: false });
          fechaPlazoCtrl.markAsUntouched();
          responsableCtrl.markAsUntouched();
        }

        fechaPlazoCtrl.updateValueAndValidity({ emitEvent: false });
        responsableCtrl.updateValueAndValidity({ emitEvent: false });
      });
  }

  private cargarHistorial(): void {
    this.cargandoHistorial.set(true);

    // 👇 USAMOS EL SERVICIO 👇
    this.seguimientosService.getHistorial(this.idRequerimiento)
      .pipe(
        finalize(() => this.cargandoHistorial.set(false))
      )
      .subscribe({
        next: (res) => {
          this.seguimientos.set(res.data ?? []);
          console.log('[Historial OK]', res.data);
          this.resaltarSeguimientoDestacado();
        },
        error: (err) => {
          this.seguimientos.set([]);
          console.error('[Historial ERROR]', err);
        }
      });
  }

  private limpiarManteniendo(): void {
    const responsable = this.form.controls.idPersonalResponsable.value;
    this.form.reset({ codTipoSeguimiento: 'SEG_NOT', fechaReal: new Date() });
    this.form.controls.idPersonalResponsable.setValue(responsable, { emitEvent: false });
  }

  private parseDateStr(dateStr: string | null): Date | null {
    if (!dateStr) return null;
    return new Date(dateStr + 'T00:00:00');
  }

  private toDateStr(d: Date | null): string | null {
    if (!d) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  descargarArchivo(id: number, nombreOriginal: string): void {
    this.seguimientosService.descargarArchivo(id).subscribe({
      next: (blob: Blob) => {
        // Creamos un link temporal para disparar la descarga
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreOriginal; // Nombre original del archivo
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error en descarga:', err);
        this.msg.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo descargar el archivo. Verifica tu conexión.'
        });
      }
    });
  }

  // 2. Método de animación
  resaltarSeguimientoDestacado(): void {
    if (!this.idSeguimientoDestacado) return;

    const idBuscado = 'seg-' + this.idSeguimientoDestacado;
    let intentos = 0;

    // Buscamos la tarjeta cada 200 milisegundos (Buscador Activo)
    const buscador = setInterval(() => {
      const elemento = document.getElementById(idBuscado);
      intentos++;

      if (elemento) {
        // ¡Lo encontramos! Detenemos la búsqueda
        clearInterval(buscador);

        console.log('Tarjeta encontrada:', idBuscado); // Te servirá para confirmar en consola

        // 1. Hacemos scroll
        elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // 2. Pintamos de amarillo
        elemento.style.transition = 'background-color 0.8s ease';
        elemento.style.backgroundColor = '#fefce8';

        // 3. Regresamos al color original a los 3 segundos
        setTimeout(() => {
          // Lo dejamos vacío ('') para que retome las clases CSS originales de tu .zen-card
          elemento.style.backgroundColor = '';
          this.idSeguimientoDestacado = null;
        }, 3000);

      } else if (intentos >= 15) {
        // Si después de 3 segundos (15 intentos * 200ms) no existe, nos rendimos para no saturar memoria
        clearInterval(buscador);
        console.warn('El Deep Link falló: No se encontró la tarjeta', idBuscado);
      }
    }, 200);
  }
}
