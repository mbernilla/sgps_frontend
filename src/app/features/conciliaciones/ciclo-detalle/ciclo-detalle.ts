import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { InputNumber } from 'primeng/inputnumber';
import { ProgressSpinner } from 'primeng/progressspinner';
import * as XLSX from 'xlsx';

import { ConciliacionService } from '../services/conciliacion.service';
import { ConciliacionDetalleDTO, ConciliacionManualRequest, RequerimientoComboDTO } from '../models/conciliacion.models';

@Component({
  selector: 'app-ciclo-detalle',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    TableModule,
    TagModule,
    Toast,
    Dialog,
    Select,
    InputNumber,
    ProgressSpinner,
    ConfirmDialog,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './ciclo-detalle.html',
  styleUrl: './ciclo-detalle.scss',
})
export class CicloDetalleComponent implements OnInit {
  private readonly route           = inject(ActivatedRoute);
  private readonly router          = inject(Router);
  private readonly service         = inject(ConciliacionService);
  private readonly msg             = inject(MessageService);
  private readonly confirmService  = inject(ConfirmationService);
  private readonly fb              = inject(FormBuilder);

  idCiclo = 0;

  readonly detalles      = signal<ConciliacionDetalleDTO[]>([]);
  readonly cargando      = signal(false);
  readonly importando    = signal(false);
  readonly conciliandoId  = signal<number | null>(null);
  readonly reviertendoId  = signal<number | null>(null);
  readonly eliminandoId   = signal<number | null>(null);

  // ── Modal: Registro / Edición Manual ─────────────────────────────────
  readonly dialogManualVisible    = signal(false);
  readonly guardandoManual        = signal(false);
  readonly idConciliacionEdicion  = signal<number | null>(null);
  readonly requerimientosCombo    = signal<RequerimientoComboDTO[]>([]);
  readonly cargandoCombo          = signal(false);

  readonly opcionesRequerimiento = computed(() =>
    this.requerimientosCombo().map(r => ({
      value: r.id,
      label: r.descripcionCompleta,
    }))
  );

  readonly manualForm: FormGroup = this.fb.group({
    idRequerimiento:   [null as number | null, Validators.required],
    horasTrabajadas:   [null as number | null, [Validators.required, Validators.min(0)]],
    horasAprobadasExcel: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  readonly totalHorasExcel    = computed(() => this.detalles().reduce((acc, d) => acc + (d.horasAprobadasExcel     || 0), 0));
  readonly totalHorasSgps     = computed(() => this.detalles().reduce((acc, d) => acc + (d.horasInternasAprobadas  || 0), 0));
  readonly totalDiferencia    = computed(() => this.detalles().reduce((acc, d) => acc + (d.diferenciaHoras         || 0), 0));

  ngOnInit(): void {
    this.idCiclo = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarDetalle();
  }

  private cargarDetalle(): void {
    this.cargando.set(true);
    this.service.getDetalleConciliaciones(this.idCiclo).subscribe({
      next: res => {
        this.detalles.set(res.data);
        this.cargando.set(false);
      },
      error: err => {
        this.cargando.set(false);
        const msg = err.error?.mensaje || 'No se pudo cargar el detalle de conciliación.';
        this.msg.add({ severity: 'error', summary: 'Error', detail: msg, life: 5000 });
      },
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);

      const payload = rows.map(row => ({
        codExterno:          row['Codigo']         ?? row['CodExterno']  ?? '',
        horasTrabajadas:     Number(row['HorasTrabajadas']  ?? 0),
        horasAprobadasExcel: Number(row['HorasAprobadas']   ?? 0),
      }));

      this.importando.set(true);
      this.service.importarExcel(this.idCiclo, payload).subscribe({
        next: () => {
          this.importando.set(false);
          this.msg.add({ severity: 'success', summary: 'Importado', detail: 'Excel procesado correctamente.', life: 3000 });
          this.cargarDetalle();
        },
        error: err => {
          this.importando.set(false);
          const msg = err.error?.mensaje || 'No se pudo importar el Excel.';
          this.msg.add({ severity: 'error', summary: 'Error', detail: msg, life: 5000 });
        },
      });

      // Reset input so the same file can be re-selected if needed
      input.value = '';
    };
    reader.readAsArrayBuffer(file);
  }

  triggerFileInput(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  // ── Modal: Registro / Edición Manual ─────────────────────────────────
  abrirManual(): void {
    this.idConciliacionEdicion.set(null);
    this.manualForm.reset();
    if (this.requerimientosCombo().length === 0) {
      this.cargandoCombo.set(true);
      this.service.getRequerimientosCombo().subscribe({
        next: res => { this.requerimientosCombo.set(res.data); this.cargandoCombo.set(false); },
        error: err => {
          this.cargandoCombo.set(false);
          this.msg.add({ severity: 'error', summary: 'Error', detail: err.error?.mensaje || 'No se pudo cargar los requerimientos.', life: 5000 });
        },
      });
    }
    this.dialogManualVisible.set(true);
  }

  abrirEdicion(item: ConciliacionDetalleDTO): void {
    this.idConciliacionEdicion.set(item.id);
    if (this.requerimientosCombo().length === 0) {
      this.cargandoCombo.set(true);
      this.service.getRequerimientosCombo().subscribe({
        next: res => { this.requerimientosCombo.set(res.data); this.cargandoCombo.set(false); },
        error: err => {
          this.cargandoCombo.set(false);
          this.msg.add({ severity: 'error', summary: 'Error', detail: err.error?.mensaje || 'No se pudo cargar los requerimientos.', life: 5000 });
        },
      });
    }
    this.manualForm.patchValue({
      idRequerimiento:  item.idRequerimiento,
      horasTrabajadas:  item.horasTrabajadas,
      horasAprobadasExcel: item.horasAprobadasExcel,
    });
    this.dialogManualVisible.set(true);
  }

  guardarManual(): void {
    if (this.manualForm.invalid) { this.manualForm.markAllAsTouched(); return; }

    const v = this.manualForm.getRawValue() as {
      idRequerimiento: number;
      horasTrabajadas: number;
      horasAprobadasExcel: number;
    };

    const payload: ConciliacionManualRequest = {
      idRequerimiento:   v.idRequerimiento,
      horasTrabajadas:   v.horasTrabajadas,
      horasAprobadasExcel: v.horasAprobadasExcel,
    };

    const idEdicion = this.idConciliacionEdicion();
    const onSuccess = (mensaje: string) => {
      this.guardandoManual.set(false);
      this.dialogManualVisible.set(false);
      this.idConciliacionEdicion.set(null);
      this.manualForm.reset();
      this.msg.add({ severity: 'success', summary: idEdicion ? 'Actualizado' : 'Registrado', detail: mensaje, life: 3000 });
      this.cargarDetalle();
    };
    const onError = (err: { error?: { mensaje?: string } }) => {
      this.guardandoManual.set(false);
      this.msg.add({ severity: 'error', summary: 'Error', detail: err.error?.mensaje || 'No se pudo guardar la conciliación.', life: 5000 });
    };

    this.guardandoManual.set(true);

    if (idEdicion !== null) {
      this.service.actualizarConciliacionManual(this.idCiclo, idEdicion, payload).subscribe({
        next: res => onSuccess(res.mensaje || 'Conciliación actualizada.'),
        error: onError,
      });
    } else {
      this.service.registrarManual(this.idCiclo, payload).subscribe({
        next: res => onSuccess(res.mensaje || 'Conciliación registrada.'),
        error: onError,
      });
    }
  }

  // ── Eliminar Conciliación ─────────────────────────────────────────────
  eliminar(item: ConciliacionDetalleDTO): void {
    this.confirmService.confirm({
      message: '¿Está seguro de eliminar esta conciliación?',
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger p-button-text',
      rejectButtonStyleClass: 'p-button-text p-button-text',
      acceptIcon: 'none',
      rejectIcon: 'none',
      accept: () => {
        this.eliminandoId.set(item.id);
        this.service.eliminarConciliacion(this.idCiclo, item.id).subscribe({
          next: res => {
            this.eliminandoId.set(null);
            this.msg.add({ severity: 'success', summary: 'Eliminado', detail: res.mensaje || 'Conciliación eliminada.', life: 3000 });
            this.cargarDetalle();
          },
          error: err => {
            this.eliminandoId.set(null);
            this.msg.add({ severity: 'error', summary: 'Error', detail: err.error?.mensaje || 'No se pudo eliminar la conciliación.', life: 5000 });
          },
        });
      },
    });
  }

  // ── Revertir Cuadre ──────────────────────────────────────────────────
  revertir(item: ConciliacionDetalleDTO): void {
    this.confirmService.confirm({
      message: '¿Desea revertir la conciliación? Los entregables asignados se liberarán.',
      header: 'Revertir Conciliación',
      icon: 'pi pi-history',
      acceptButtonStyleClass: 'p-button-warning p-button-text',
      rejectButtonStyleClass: 'p-button-text p-button-text',
      acceptIcon: 'none',
      rejectIcon: 'none',
      accept: () => {
        this.reviertendoId.set(item.id);
        this.service.revertirConciliacion(this.idCiclo, item.id).subscribe({
          next: res => {
            this.reviertendoId.set(null);
            this.msg.add({ severity: 'warn', summary: 'Revertido', detail: res.mensaje || 'La conciliación fue revertida.', life: 3000 });
            this.cargarDetalle();
          },
          error: err => {
            this.reviertendoId.set(null);
            this.msg.add({ severity: 'error', summary: 'Error', detail: err.error?.mensaje || 'No se pudo revertir la conciliación.', life: 5000 });
          },
        });
      },
    });
  }

  // ── Confirmar Cuadre ─────────────────────────────────────────────────
  conciliar(item: ConciliacionDetalleDTO): void {
    this.confirmService.confirm({
      message: '¿Está seguro de confirmar el cuadre? Esta acción asignará los entregables al ciclo y bloqueará futuras ediciones.',
      header: 'Confirmar Cuadre',
      icon: 'pi pi-check-circle',
      acceptButtonStyleClass: 'p-button-success p-button-text',
      rejectButtonStyleClass: 'p-button-text p-button-text',
      acceptIcon: 'none',
      rejectIcon: 'none',
      accept: () => {
        this.conciliandoId.set(item.id);
        this.service.confirmarConciliacion(this.idCiclo, item.id).subscribe({
          next: res => {
            this.conciliandoId.set(null);
            this.msg.add({ severity: 'success', summary: 'Cuadre confirmado', detail: res.mensaje || 'La conciliación fue confirmada.', life: 3000 });
            this.cargarDetalle();
          },
          error: err => {
            this.conciliandoId.set(null);
            this.msg.add({ severity: 'error', summary: 'Error', detail: err.error?.mensaje || 'No se pudo confirmar el cuadre.', life: 5000 });
          },
        });
      },
    });
  }

  volverALista(): void {
    this.router.navigate(['/conciliaciones/maestro']);
  }
}
