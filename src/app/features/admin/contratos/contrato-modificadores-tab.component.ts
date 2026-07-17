import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize, map } from 'rxjs/operators';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { Dialog } from 'primeng/dialog';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

import { ActionOrchestratorService } from '../../../shared/services/action-orchestrator.service';
import { MaestraService } from '../../../core/services/maestra.service';
import { ContratoAdminService } from './contrato-admin.service';
import {
  ContratoModificadorResponse,
  ContratoModificadorRequest
} from './contrato-admin.model';
import { ConceptoDTO } from '../../../core/models/maestra.model';

@Component({
  selector: 'app-contrato-modificadores-tab',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputNumberModule,
    Select,
    Textarea,
    Dialog,
    Toast,
    ConfirmDialog,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './contrato-modificadores-tab.component.html',
  styleUrl: './contrato-modificadores-tab.component.scss',
})
export class ContratoModificadoresTabComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(ContratoAdminService);
  private readonly maestra = inject(MaestraService);
  private readonly msg = inject(MessageService);
  private readonly actionService = inject(ActionOrchestratorService);

  // ── Inputs ────────────────────────────────────────────────────────────────

  readonly contratoId = input.required<number>();

  // ── Estado reactivo ───────────────────────────────────────────────────────

  readonly modificadores = signal<ContratoModificadorResponse[]>([]);
  tiposModificadorOpts = signal<ConceptoDTO[]>([]);

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly modal = signal(false);

  readonly modificadorEnEdicion = signal<ContratoModificadorResponse | null>(null);

  readonly titulo = computed(() =>
    this.modificadorEnEdicion() ? 'Editar Modificador' : 'Agregar Modificador'
  );
  readonly labelBtn = computed(() =>
    this.modificadorEnEdicion() ? 'Actualizar' : 'Guardar'
  );

  // ── Formulario ────────────────────────────────────────────────────────────

  readonly form = this.fb.group({
    codTipoModificador: this.fb.nonNullable.control('', Validators.required),
    porcentaje: this.fb.nonNullable.control<number>(0, [
      Validators.required,
      Validators.min(-100),
      Validators.max(100),
    ]),
    descripcion: this.fb.nonNullable.control('', Validators.required),
  });

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.cargarModificadores();
    this.cargarOpciones();
  }

  // ── Métodos ───────────────────────────────────────────────────────────────

  private cargarModificadores(): void {
    this.cargando.set(true);
    this.svc.getModificadores(this.contratoId())
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: m => this.modificadores.set(m),
        error: () => this.toast('error', 'Error', 'No se pudieron cargar los modificadores.'),
      });
  }

  private cargarOpciones(): void {
    this.maestra.getConceptos('MOD_TAR')
      .subscribe({
        next: lista => this.tiposModificadorOpts.set(lista),
        error: () => this.toast('warn', 'Advertencia', 'No se cargaron los modificadores disponibles.'),
      });
  }

  abrirNuevo(): void {
    this.modificadorEnEdicion.set(null);
    this.form.reset();
    this.modal.set(true);
  }

  editar(mod: ContratoModificadorResponse, event: Event): void {
    event.stopPropagation();
    this.modificadorEnEdicion.set(mod);
    this.form.patchValue({
      codTipoModificador: mod.codTipoModificador,
      porcentaje: mod.porcentaje,
      descripcion: mod.descripcion,
    });
    this.modal.set(true);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const raw: ContratoModificadorRequest = this.form.getRawValue();
    const enEdicion = this.modificadorEnEdicion();

    const observer = {
      next: () => {
        this.toast(
          'success',
          enEdicion ? 'Actualizado' : 'Creado',
          'Modificador guardado correctamente.'
        );
        this.modal.set(false);
        this.cargarModificadores();
      },
      error: (err: any) =>
        this.toast(
          'error',
          'Error al guardar',
          err.error?.mensaje ?? 'No se pudo guardar el modificador.'
        ),
    };

    if (enEdicion) {
      this.svc.updateModificador(this.contratoId(), enEdicion.id, raw)
        .pipe(finalize(() => this.guardando.set(false)))
        .subscribe(observer);
    } else {
      this.svc.createModificador(this.contratoId(), raw)
        .pipe(finalize(() => this.guardando.set(false)))
        .subscribe(observer);
    }
  }

  eliminar(mod: ContratoModificadorResponse, event: Event): void {
    event.stopPropagation();

    this.actionService.ejecutar({
      header: 'Confirmar baja lógica',
      message: `¿Dar de baja el modificador "<b>${mod.descripcionModificador}</b>"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptClass: 'p-button-danger p-button-sm',
      action: () => this.svc.deleteModificador(this.contratoId(), mod.id),
      onSuccess: () => this.cargarModificadores(),
    });
  }

  // ── Privados ──────────────────────────────────────────────────────────────

  private toast(severity: string, summary: string, detail: string): void {
    this.msg.add({ severity, summary, detail, life: 4000 });
  }

  getDescripcionTipo(cod: string): string {
    const opt = this.tiposModificadorOpts().find(o => o.codigo === cod);
    return opt ? opt.descripcion : cod;
  }

  getClaseSigno(porcentaje: number): string {
    return porcentaje > 0 ? 'text-green-600' : porcentaje < 0 ? 'text-red-600' : 'text-slate-600';
  }
}
