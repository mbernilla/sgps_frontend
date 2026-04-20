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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { Textarea } from 'primeng/textarea';
import { Button } from 'primeng/button';
import { Timeline } from 'primeng/timeline';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService, PrimeTemplate } from 'primeng/api';

import { MaestraService } from '../../../../core/services/maestra.service';
import { PersonalDTO } from '../../../../core/models/maestra.model';
import { ApiResponse, SeguimientoDTO } from '../../models/requerimientos.models';
import { environment } from '../../../../../environments/environment';

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces locales
// ─────────────────────────────────────────────────────────────────────────────

/**
 * El endpoint /maestras/conceptos devuelve objetos cuyo campo `id` actúa como
 * código (ej. 'SEG_NOT') y tiene un campo `nombre` para display.
 * La interfaz ConceptoDTO del core usa `descripcion`, pero el backend retorna
 * `nombre` para este endpoint — usamos un tipo local para evitar el cast.
 */
interface ConceptoSelectDTO {
  id: string | number;
  nombre: string;
}

/** Payload exacto que espera el endpoint POST /v1/seguimientos */
interface SeguimientoCreateDTO {
  idRequerimiento:      number;
  codTipoSeguimiento:   string;
  descripcion:          string;
  fechaReal:            string;        // YYYY-MM-DD
  fechaPlazo:           string | null; // YYYY-MM-DD
  idPersonalResponsable: number;
  codEstado:            string;
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
    Tag,
    Toast,
    ToggleSwitchModule,
    ConfirmDialog,
    PrimeTemplate,  // Requerido para que <ng-template pTemplate="..."> funcione en componentes standalone
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './seguimientos-panel.html',
  styleUrl:    './seguimientos-panel.scss',
})
export class SeguimientosPanel implements OnInit, OnChanges {

  @Input({ required: true }) idRequerimiento!: number;

  // ── Servicios ─────────────────────────────────────────────────────────
  private readonly fb         = inject(FormBuilder);
  private readonly http       = inject(HttpClient);
  private readonly maestra    = inject(MaestraService);
  private readonly msg                 = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly destroyRef          = inject(DestroyRef);

  private readonly apiBase = environment.baseUrl;

  // ── Estado de UI ──────────────────────────────────────────────────────
  readonly cargandoHistorial = signal(false);
  readonly guardando         = signal(false);

  // ── Opciones de combos (se cargan en ngOnInit) ────────────────────────
  readonly tipoOpts     = signal<ConceptoSelectDTO[]>([]);
  readonly personalOpts = signal<PersonalDTO[]>([]);

  // ── Datos del timeline ────────────────────────────────────────────────
  readonly seguimientos          = signal<SeguimientoDTO[]>([]);
  readonly mostrarAtendidos      = signal<boolean>(false);
  readonly seguimientosFiltrados = computed(() =>
    this.mostrarAtendidos()
      ? this.seguimientos()
      : this.seguimientos().filter(s => s.codEstado === 'SEG_PEN')
  );
  readonly seguimientoEnEdicion  = signal<SeguimientoDTO | null>(null);

  // ── Formulario de registro ────────────────────────────────────────────
  readonly form = this.fb.group({
    codTipoSeguimiento:    this.fb.nonNullable.control('',       Validators.required),
    idPersonalResponsable: this.fb.control<number | null>(null,  Validators.required),
    descripcion:           this.fb.nonNullable.control('',       [Validators.required, Validators.maxLength(500)]),
    fechaReal:             this.fb.control<Date | null>(new Date(), Validators.required),
    fechaPlazo:            this.fb.control<Date | null>(null),   // validación dinámica
  });

  /**
   * true cuando el tipo seleccionado NO es "Nota" (SEG_NOT) y hay un valor.
   * Controla la visibilidad de fechaPlazo en el template.
   */
  readonly mostrarFechasPlazo = toSignal(
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
      ? this.http.put<ApiResponse<SeguimientoDTO>>(`${this.apiBase}/v1/seguimientos/${editando.id}`, payload)
      : this.http.post<ApiResponse<SeguimientoDTO>>(`${this.apiBase}/v1/seguimientos`, payload);

    request$.subscribe({
      next: () => {
        this.msg.add({
          severity: 'success',
          summary:  editando ? 'Actualizado' : 'Registrado',
          detail:   editando
            ? 'El seguimiento fue actualizado correctamente.'
            : 'El seguimiento fue guardado correctamente.',
          life: 3000,
        });
        if (editando) {
          this.cancelarEdicion();
        } else {
          this.limpiarManteniendo();
        }
        this.cargarHistorial();
      },
      error: (err) => {
        this.msg.add({
          severity: 'error',
          summary:  'Error al guardar',
          detail:   err.error?.mensaje ?? 'No se pudo guardar el seguimiento.',
          life:     5000,
        });
        this.guardando.set(false);
      },
      complete: () => this.guardando.set(false),
    });
  }

  /** Limpia el formulario completo (botón manual del usuario). */
  limpiar(): void {
    this.form.reset({ fechaReal: new Date() });
  }

  /** Carga el seguimiento en el formulario para editarlo. */
  editar(seg: SeguimientoDTO): void {
    this.seguimientoEnEdicion.set(seg);
    this.form.patchValue({
      codTipoSeguimiento:    seg.codTipoSeguimiento,
      idPersonalResponsable: seg.idPersonalResponsable,
      descripcion:           seg.descripcion,
      fechaReal:             this.parseDateStr(seg.fechaReal),
      fechaPlazo:            this.parseDateStr(seg.fechaPlazo),
    });
  }

  /** Cancela la edición y restaura el formulario a estado de creación. */
  cancelarEdicion(): void {
    this.seguimientoEnEdicion.set(null);
    this.form.reset({ fechaReal: new Date() });
  }

  /** Marca el seguimiento como atendido (SEG_ATE) vía PATCH. */
  atenderSeguimiento(id: number): void {
    this.http
      .patch(`${this.apiBase}/v1/seguimientos/${id}/estado`, { codEstado: 'SEG_ATE' })
      .subscribe({
        next: () => {
          this.msg.add({
            severity: 'success',
            summary:  'Atendido',
            detail:   'El seguimiento fue marcado como atendido.',
            life:     3000,
          });
          this.cargarHistorial();
        },
        error: (err) => {
          this.msg.add({
            severity: 'error',
            summary:  'Error al atender',
            detail:   err.error?.mensaje ?? 'No se pudo actualizar el estado.',
            life:     5000,
          });
        },
      });
  }

  /** Solicita confirmación y elimina el seguimiento por su id. */
  eliminarSeguimiento(id: number): void {
    this.confirmationService.confirm({
      message:               '¿Está seguro que desea anular este seguimiento?',
      header:                'Confirmar eliminación',
      icon:                  'pi pi-exclamation-triangle',
      acceptLabel:           'Sí, anular',
      rejectLabel:           'Cancelar',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-text p-button-sm',
      accept: () => {
        this.http
          .delete(`${this.apiBase}/v1/seguimientos/${id}`)
          .subscribe({
            next: () => {
              this.msg.add({
                severity: 'success',
                summary:  'Anulado',
                detail:   'El seguimiento fue anulado correctamente.',
                life:     3000,
              });
              this.cargarHistorial();
            },
            error: (err) => {
              this.msg.add({
                severity: 'error',
                summary:  'Error al anular',
                detail:   err.error?.mensaje ?? 'No se pudo anular el seguimiento.',
                life:     5000,
              });
            },
          });
      },
    });
  }

  // ── Helpers de resolución de catálogo ─────────────────────────────────

  /** Devuelve el nombre del tipo de seguimiento dado su código (id en el catálogo). */
  getNombreTipo(cod: string): string {
    return this.tipoOpts().find(t => t.id === cod)?.nombre ?? cod;
  }

  /** Devuelve el nombre completo del responsable dado su id numérico. */
  getNombreResponsable(id: number): string {
    return this.personalOpts().find(p => p.id === id)?.nombresApellidos ?? 'Desconocido';
  }

  // ── Privados ──────────────────────────────────────────────────────────

  /**
   * Carga en paralelo los combos de Tipo de Seguimiento y Personal.
   * Usa MaestraService para aprovechar su caché por shareReplay.
   */
  private cargarMaestras(): void {
    forkJoin({
      tipos:    this.maestra.getConceptos('TIP_SEG').pipe(
                  map(lista => lista as unknown as ConceptoSelectDTO[])
                ),
      personal: this.maestra.getPersonal(),
    }).subscribe({
      next: ({ tipos, personal }) => {
        this.tipoOpts.set(tipos);
        this.personalOpts.set(personal);
      },
      // Error silencioso: los combos quedan vacíos; el form no puede guardarse
    });
  }

  /**
   * Añade / quita el validador required en fechaPlazo según el tipo elegido.
   * Tipo "Tarea" (SEG_TAR) obliga a declarar una fecha límite.
   */
  private suscribirValidacionDinamica(): void {
    this.form.controls.codTipoSeguimiento.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(tipo => {
        const ctrl = this.form.controls.fechaPlazo;

        if (tipo === 'SEG_TAR') {
          ctrl.addValidators(Validators.required);
        } else {
          ctrl.removeValidators(Validators.required);
          // Limpiamos el valor al ocultar el campo para no enviar fechas fantasma
          if (tipo === 'SEG_NOT') {
            ctrl.setValue(null, { emitEvent: false });
          }
        }

        ctrl.updateValueAndValidity({ emitEvent: false });
      });
  }

  /** GET /v1/seguimientos/requerimiento/{id} */
private cargarHistorial(): void {
    this.cargandoHistorial.set(true);

    this.http
      .get<ApiResponse<SeguimientoDTO[]>>(
        `${this.apiBase}/v1/seguimientos/requerimiento/${this.idRequerimiento}`
      )
      .pipe(
        // finalize siempre se ejecuta, sea éxito o error, apagando el spinner de forma segura
        finalize(() => this.cargandoHistorial.set(false))
      )
      .subscribe({
        next:  (res) => {
          this.seguimientos.set(res.data ?? []);
          console.log('[Historial OK]', res.data);
        },
        error: (err) => {
          this.seguimientos.set([]);
          console.error('[Historial ERROR]', err); // 👈 Veamos qué está fallando
        }
      });
  }

  /**
   * Tras un POST exitoso: limpia el form pero conserva el responsable
   * para que el usuario pueda registrar el siguiente seguimiento rápido.
   */
  private limpiarManteniendo(): void {
    const responsable = this.form.controls.idPersonalResponsable.value;
    this.form.reset({ fechaReal: new Date() });
    this.form.controls.idPersonalResponsable.setValue(responsable, { emitEvent: false });
  }

  /**
   * Convierte un string 'YYYY-MM-DD' a Date usando hora local (T00:00:00)
   * para evitar el desfase que produciría el constructor Date(string) en UTC.
   */
  private parseDateStr(dateStr: string | null): Date | null {
    if (!dateStr) return null;
    // Agregamos T00:00:00 para forzar hora local y evitar desfase de timezone
    return new Date(dateStr + 'T00:00:00');
  }

  /**
   * Serializa un Date a 'YYYY-MM-DD' usando getFullYear/getMonth/getDate
   * para evitar el desfase que produciría .toISOString() con zonas UTC-X.
   */
  private toDateStr(d: Date | null): string | null {
    if (!d) return null;
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
}
