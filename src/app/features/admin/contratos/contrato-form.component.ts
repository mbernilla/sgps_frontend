import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { DatePicker } from 'primeng/datepicker';
import { TabsModule } from 'primeng/tabs';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { ContratoAdminService } from './contrato-admin.service';
import { ContratoGtTabComponent } from './contrato-gt-tab.component';
import { ContratoModificadoresTabComponent } from './contrato-modificadores-tab.component';
import {
  ContratoResponse,
  ContratoRequest,
  FabricaOption,
} from './contrato-admin.model';

@Component({
  selector: 'app-contrato-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    Select,
    Textarea,
    DatePicker,
    TabsModule,
    Toast,
    ContratoGtTabComponent,
    ContratoModificadoresTabComponent,
  ],
  providers: [MessageService],
  templateUrl: './contrato-form.component.html',
  styleUrl: './contrato-form.component.scss',
})
export class ContratoFormComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(ContratoAdminService);
  private readonly msg = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  // ── Estado reactivo ───────────────────────────────────────────────────────

  readonly fabricas = signal<FabricaOption[]>([]);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly contratoEnEdicion = signal<ContratoResponse | null>(null);
  readonly isNuevo = computed(() => !this.contratoEnEdicion());
  readonly contratoId = computed(() => this.contratoEnEdicion()?.id ?? 0);

  readonly titulo = computed(() =>
    this.isNuevo() ? 'Nuevo Contrato' : `Editar Contrato`
  );

  // ── Formulario ────────────────────────────────────────────────────────────

  readonly form = this.fb.group({
    idFabrica: this.fb.nonNullable.control<number | null>(null, Validators.required),
    codigoContrato: this.fb.nonNullable.control('', Validators.required),
    descripcion: this.fb.nonNullable.control('', Validators.required),
    fechaContrato: this.fb.nonNullable.control<Date | null>(null, Validators.required),
    fechaInicio: this.fb.nonNullable.control<Date | null>(null, Validators.required),
    fechaTermino: this.fb.nonNullable.control<Date | null>(null, Validators.required),
    numeroMeses: this.fb.nonNullable.control<number>(0, [Validators.required, Validators.min(1)]),
  });

  // ── Constructor ───────────────────────────────────────────────────────────

  constructor() {
    this.configurarCalculoAutomaticoFechas();
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.cargarFabricas();
    this.cargarContrato();
  }

  // ── Cálculos Automáticos ──────────────────────────────────────────────────

  private configurarCalculoAutomaticoFechas(): void {
    // 1. Cuando cambia numeroMeses, recalcular fechaTermino
    this.form.controls.numeroMeses.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((meses: number) => {
        if (meses && meses > 0) {
          const fechaInicio = this.form.get('fechaInicio')?.value as Date | null;
          if (fechaInicio) {
            const nuevaFechaTermino = this.sumarMesesCalendario(fechaInicio, meses);
            this.form.get('fechaTermino')?.setValue(nuevaFechaTermino, { emitEvent: false });
          }
        }
      });

    // 2. Cuando cambia fechaTermino, recalcular numeroMeses
    this.form.controls.fechaTermino.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((fechaTermino: Date | null) => {
        if (fechaTermino) {
          const fechaInicio = this.form.get('fechaInicio')?.value as Date | null;
          if (fechaInicio) {
            const mesesCalculados = this.calcularMesesCalendario(fechaInicio, fechaTermino);
            this.form.get('numeroMeses')?.setValue(mesesCalculados, { emitEvent: false });
          }
        }
      });

    // 3. Cuando cambia fechaInicio y existe numeroMeses, desplazar fechaTermino
    this.form.controls.fechaInicio.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((fechaInicio: Date | null) => {
        if (fechaInicio) {
          const meses = this.form.get('numeroMeses')?.value as number | null;
          if (meses && meses > 0) {
            const nuevaFechaTermino = this.sumarMesesCalendario(fechaInicio, meses);
            this.form.get('fechaTermino')?.setValue(nuevaFechaTermino, { emitEvent: false });
          }
        }
      });
  }

  // Suma X meses a una fecha usando calendario exacto (mantiene el día del mes)
  private sumarMesesCalendario(fecha: Date, meses: number): Date {
    const nuevaFecha = new Date(fecha);
    nuevaFecha.setMonth(nuevaFecha.getMonth() + meses);
    return nuevaFecha;
  }

  // Calcula la diferencia en meses usando calendario exacto
  private calcularMesesCalendario(fechaInicio: Date, fechaTermino: Date): number {
    const anioInicio = fechaInicio.getFullYear();
    const mesInicio = fechaInicio.getMonth();
    const diaInicio = fechaInicio.getDate();

    const anioTermino = fechaTermino.getFullYear();
    const mesTermino = fechaTermino.getMonth();
    const diaTermino = fechaTermino.getDate();

    // Calcula la diferencia en meses: (año_diff * 12) + mes_diff
    let mesesCalculados = (anioTermino - anioInicio) * 12 + (mesTermino - mesInicio);

    // Si el día de término es menor al día de inicio, no completó el último mes
    if (diaTermino < diaInicio) {
      mesesCalculados--;
    }

    // Garantiza un mínimo de 1 mes
    return Math.max(1, mesesCalculados);
  }

  // ── Métodos ───────────────────────────────────────────────────────────────

  private cargarFabricas(): void {
    this.svc.getFabricas().subscribe({
      next: f => this.fabricas.set(f),
      error: () => this.toast('warn', 'Advertencia', 'No se pudieron cargar las fábricas.'),
    });
  }

  private cargarContrato(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.cargando.set(true);
        this.svc.getContrato(Number(id))
          .pipe(finalize(() => this.cargando.set(false)))
          .subscribe({
            next: contrato => {
              this.contratoEnEdicion.set(contrato);
              this.llenarFormulario(contrato);
            },
            error: () => {
              this.toast('error', 'Error', 'No se pudo cargar el contrato.');
              this.volverAlListado();
            },
          });
      }
    });
  }

  private llenarFormulario(contrato: ContratoResponse): void {
    this.form.patchValue({
      idFabrica: contrato.idFabrica,
      codigoContrato: contrato.codigoContrato,
      descripcion: contrato.descripcion,
      fechaContrato: this.parseFecha(contrato.fechaContrato),
      fechaInicio: this.parseFecha(contrato.fechaInicio),
      fechaTermino: this.parseFecha(contrato.fechaTermino),
      numeroMeses: contrato.numeroMeses,
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const raw = this.form.getRawValue();
    const dto: ContratoRequest = {
      idFabrica: raw.idFabrica!,
      codigoContrato: raw.codigoContrato,
      descripcion: raw.descripcion,
      fechaContrato: this.formatFecha(raw.fechaContrato),
      fechaInicio: this.formatFecha(raw.fechaInicio),
      fechaTermino: this.formatFecha(raw.fechaTermino),
      numeroMeses: raw.numeroMeses,
    };

    const enEdicion = this.contratoEnEdicion();
    const observer = {
      next: () => {
        this.toast(
          'success',
          enEdicion ? 'Actualizado' : 'Creado',
          'Contrato guardado correctamente.'
        );
        this.volverAlListado();
      },
      error: (err: any) =>
        this.toast(
          'error',
          'Error al guardar',
          err.error?.mensaje ?? 'No se pudo guardar el contrato.'
        ),
    };

    if (enEdicion) {
      this.svc.updateContrato(enEdicion.id, dto)
        .pipe(finalize(() => this.guardando.set(false)))
        .subscribe(observer);
    } else {
      this.svc.createContrato(dto)
        .pipe(finalize(() => this.guardando.set(false)))
        .subscribe(observer);
    }
  }

  volverAlListado(): void {
    this.router.navigate(['/admin/contratos']);
  }

  // ── Privados ──────────────────────────────────────────────────────────────

  private parseFecha(fechaStr: string): Date {
    if (!fechaStr) return new Date();
    const [year, month, day] = fechaStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private formatFecha(fecha: Date | null): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toast(severity: string, summary: string, detail: string): void {
    this.msg.add({ severity, summary, detail, life: 4000 });
  }
}
