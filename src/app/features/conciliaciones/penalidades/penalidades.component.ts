import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Toast } from 'primeng/toast';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { ProgressSpinner } from 'primeng/progressspinner';


import { ConciliacionService } from '../services/conciliacion.service';
import { AppContextService } from '../../../core/services/app-context.service'
import { ConceptoDTO, PenalidadDTO, PenalidadRequest, RequerimientoComboDTO, SlaComboDTO } from '../models/conciliacion.models';

@Component({
  selector: 'app-penalidades',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    TableModule,
    Toast,
    Dialog,
    Select,
    InputNumber,
    Textarea,
    ProgressSpinner,
    ConfirmDialog
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './penalidades.component.html',
  styleUrl: './penalidades.component.scss',
})
export class PenalidadesComponent implements OnInit {
  private readonly route          = inject(ActivatedRoute);
  private readonly router         = inject(Router);
  private readonly service        = inject(ConciliacionService);
  private readonly msg            = inject(MessageService);
  private readonly confirmService = inject(ConfirmationService);
  private readonly fb             = inject(FormBuilder);

  private readonly appContext = inject(AppContextService);

  idCiclo = 0;

  readonly penalidades    = signal<PenalidadDTO[]>([]);
  readonly cargando       = signal(false);

  readonly slas           = signal<SlaComboDTO[]>([]);
  readonly requerimientos = signal<RequerimientoComboDTO[]>([]);
  readonly gruposTec      = signal<ConceptoDTO[]>([]);

  readonly displayModal = signal(false);
  readonly guardando    = signal(false);
  readonly eliminandoId = signal<number | null>(null);
  readonly editandoId   = signal<number | null>(null);

  readonly penalidadForm: FormGroup = this.fb.group({
    idContratoSla:       [null as number | null, Validators.required],
    idRequerimiento:     [null as number | null],
    codGrupoTecnologico: [null as string | null, Validators.required],
    horasPenalidad:      [null as number | null, [Validators.required, Validators.min(0)]],
    observacion:         ['', Validators.required],
  });

  ngOnInit(): void {
    this.idCiclo = Number(this.route.snapshot.paramMap.get('idCiclo'));
    this.cargarPenalidades();
    this.cargarCombos();
  }

  private cargarPenalidades(): void {
    this.cargando.set(true);
    this.service.getPenalidadesPorCiclo(this.idCiclo).subscribe({
      next: res => { this.penalidades.set(res.data); this.cargando.set(false); },
      error: err => {
        this.cargando.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: err.error?.mensaje || 'No se pudieron cargar las penalidades.', life: 5000 });
      },
    });
  }

  private cargarCombos(): void {
    this.service.getSlasCombo(this.appContext.idContratoSeleccionado()).subscribe({
      next: res => this.slas.set(res.data),
      error: () => {},
    });

    this.service.getRequerimientosCombo().subscribe({
      next: res => {
        const lista = res.data as (RequerimientoComboDTO & { id: number | null })[];
        lista.unshift({ id: null, codigoInternoFormateado: '', descripcionCompleta: 'Sin requerimiento asociado' });
        this.requerimientos.set(lista as RequerimientoComboDTO[]);
      },
      error: () => {},
    });

    this.service.getConceptos('GRP_TEC').subscribe({
      next: res => this.gruposTec.set(res.data),
      error: () => {},
    });
  }

  abrirNuevo(): void {
    this.editandoId.set(null);
    this.penalidadForm.reset();
    this.displayModal.set(true);
  }

  abrirEditar(item: PenalidadDTO): void {
    // EL CHIVATO: Veamos exactamente qué está llegando desde la grilla
  console.log('1. Item crudo de la grilla:', item);

    this.editandoId.set(item.id);
    this.penalidadForm.patchValue({
      idContratoSla:       item.idContratoSla,
      idRequerimiento:     item.idRequerimiento,
      codGrupoTecnologico: item.codGrupoTecnologico,
      horasPenalidad:      item.horasPenalidad,
      observacion:         item.observacion,
    });

    console.log('2. Valores del formulario:', this.penalidadForm.value);

    this.displayModal.set(true);
  }



  registrarPenalidad(): void {
    if (this.penalidadForm.invalid) { this.penalidadForm.markAllAsTouched(); return; }

    const v = this.penalidadForm.getRawValue() as {
      idContratoSla: number;
      idRequerimiento: number | null;
      codGrupoTecnologico: string;
      horasPenalidad: number;
      observacion: string;
    };

    const payload: PenalidadRequest = {
      idContratoSla:       v.idContratoSla,
      idRequerimiento:     v.idRequerimiento,
      codGrupoTecnologico: v.codGrupoTecnologico,
      horasPenalidad:      v.horasPenalidad,
      observacion:         v.observacion,
    };

    const idEdicion = this.editandoId();
    const request$ = idEdicion
      ? this.service.actualizarPenalidad(this.idCiclo, idEdicion, payload)
      : this.service.guardarPenalidad(this.idCiclo, payload) as any;

    this.guardando.set(true);
    request$.subscribe({
      next: (res: any) => {
        this.guardando.set(false);
        this.displayModal.set(false);
        this.editandoId.set(null);
        this.msg.add({ severity: 'success', summary: idEdicion ? 'Actualizado' : 'Registrado', detail: res.mensaje || (idEdicion ? 'Penalidad actualizada.' : 'Penalidad registrada.'), life: 3000 });
        this.cargarPenalidades();
      },
      error: (err:any) => {
        this.guardando.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: err.error?.mensaje || 'No se pudo guardar la penalidad.', life: 5000 });
      },
    });
  }

  confirmarEliminar(item: PenalidadDTO): void {
    this.confirmService.confirm({
      message: '¿Está seguro de eliminar esta penalidad?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger p-button-text',
      rejectButtonStyleClass: 'p-button-text p-button-text',
      acceptIcon: 'none',
      rejectIcon: 'none',
      accept: () => {
        this.eliminandoId.set(item.id);
        this.service.eliminarPenalidad(this.idCiclo, item.id).subscribe({
          next: res => {
            this.eliminandoId.set(null);
            this.msg.add({ severity: 'success', summary: 'Eliminado', detail: res.mensaje || 'Penalidad eliminada.', life: 3000 });
            this.cargarPenalidades();
          },
          error: err => {
            this.eliminandoId.set(null);
            this.msg.add({ severity: 'error', summary: 'Error', detail: err.error?.mensaje || 'No se pudo eliminar la penalidad.', life: 5000 });
          },
        });
      },
    });
  }

  volver(): void {
    this.router.navigate(['/conciliaciones/maestro']);
  }
}
