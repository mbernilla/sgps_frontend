import {
  Component,
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
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
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
import { MessageService } from 'primeng/api';

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
  visibleEnReporte:     boolean;
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
    ReactiveFormsModule,
    Select,
    DatePicker,
    Textarea,
    Button,
    Timeline,
    Tag,
    Toast,
  ],
  providers: [MessageService],
  templateUrl: './seguimientos-panel.html',
  styleUrl:    './seguimientos-panel.scss',
})
export class SeguimientosPanel implements OnInit, OnChanges {

  @Input({ required: true }) idRequerimiento!: number;

  // ── Servicios ─────────────────────────────────────────────────────────
  private readonly fb         = inject(FormBuilder);
  private readonly http       = inject(HttpClient);
  private readonly maestra    = inject(MaestraService);
  private readonly msg        = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly apiBase = environment.baseUrl;

  // ── Estado de UI ──────────────────────────────────────────────────────
  readonly cargandoHistorial = signal(false);
  readonly guardando         = signal(false);

  // ── Opciones de combos (se cargan en ngOnInit) ────────────────────────
  readonly tipoOpts     = signal<ConceptoSelectDTO[]>([]);
  readonly personalOpts = signal<PersonalDTO[]>([]);

  // ── Datos del timeline ────────────────────────────────────────────────
  readonly seguimientos = signal<SeguimientoDTO[]>([]);

  // ── Formulario de registro ────────────────────────────────────────────
  readonly form = this.fb.group({
    codTipoSeguimiento:    this.fb.nonNullable.control('',       Validators.required),
    idPersonalResponsable: this.fb.control<number | null>(null,  Validators.required),
    descripcion:           this.fb.nonNullable.control('',       [Validators.required, Validators.maxLength(500)]),
    fechaReal:             this.fb.control<Date | null>(null,    Validators.required),
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

    const raw = this.form.getRawValue();

    const payload: SeguimientoCreateDTO = {
      idRequerimiento:      this.idRequerimiento,
      codTipoSeguimiento:   raw.codTipoSeguimiento,
      descripcion:          raw.descripcion,
      fechaReal:            this.toDateStr(raw.fechaReal)!,
      fechaPlazo:           this.toDateStr(raw.fechaPlazo),
      idPersonalResponsable: raw.idPersonalResponsable!,
      visibleEnReporte:     false,
      codEstado:            'SEG_PEN',  // siempre "Pendiente" al crear
    };

    this.guardando.set(true);

    this.http
      .post<ApiResponse<SeguimientoDTO>>(`${this.apiBase}/v1/seguimientos`, payload)
      .subscribe({
        next: () => {
          this.msg.add({
            severity: 'success',
            summary:  'Registrado',
            detail:   'El seguimiento fue guardado correctamente.',
            life:     3000,
          });
          this.limpiarManteniendo();
          this.cargarHistorial();
        },
        error: (err) => {
          this.msg.add({
            severity: 'error',
            summary:  'Error al guardar',
            detail:   err.error?.mensaje ?? 'No se pudo registrar el seguimiento.',
            life:     5000,
          });
          this.guardando.set(false);
        },
        complete: () => this.guardando.set(false),
      });
  }

  /** Limpia el formulario completo (botón manual del usuario). */
  limpiar(): void {
    this.form.reset();
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
    this.form.reset();
    this.form.controls.idPersonalResponsable.setValue(responsable, { emitEvent: false });
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
