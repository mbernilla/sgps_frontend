import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { PrimeTemplate, ConfirmationService, MessageService } from 'primeng/api';

import { ActionOrchestratorService } from '../../../shared/services/action-orchestrator.service';
import { GerenciasService } from './gerencias.service';
import {
  GerenciaDTO,
  EquipoDTO,
  GerenciaCreateDTO,
  GerenciaUpdateDTO,
  EquipoCreateDTO,
  EquipoUpdateDTO
} from './gerencias.models';

@Component({
  selector: 'app-gerencias-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    Dialog,
    Toast,
    ConfirmDialog,
    PrimeTemplate,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './gerencias-admin.component.html',
  styleUrl: './gerencias-admin.component.scss',
})
export class GerenciasAdminComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(GerenciasService);
  private readonly msg = inject(MessageService);
  private readonly actionService = inject(ActionOrchestratorService);

  // ── Estado reactivo ───────────────────────────────────────────────────────

  readonly gerencias = signal<GerenciaDTO[]>([]);
  readonly equipos = signal<EquipoDTO[]>([]);
  readonly gerenciaSeleccionada = signal<GerenciaDTO | null>(null);

  readonly cargandoGerencias = signal(false);
  readonly cargandoEquipos = signal(false);
  readonly guardandoGerencia = signal(false);
  readonly guardandoEquipo = signal(false);

  readonly dialogGerenciaVisible = signal(false);
  readonly dialogEquipoVisible = signal(false);

  readonly gerenciaEnEdicion = signal<GerenciaDTO | null>(null);
  readonly equipoEnEdicion = signal<EquipoDTO | null>(null);

  readonly tituloModalGerencia = computed(() =>
    this.gerenciaEnEdicion() ? 'Editar Gerencia' : 'Nueva Gerencia'
  );
  readonly tituloModalEquipo = computed(() =>
    this.equipoEnEdicion() ? 'Editar Equipo' : 'Nuevo Equipo'
  );
  readonly labelBtnGerencia = computed(() =>
    this.gerenciaEnEdicion() ? 'Actualizar' : 'Guardar'
  );
  readonly labelBtnEquipo = computed(() =>
    this.equipoEnEdicion() ? 'Actualizar' : 'Guardar'
  );

  readonly tituloEquiposPanel = computed(() => {
    const g = this.gerenciaSeleccionada();
    return g ? `Equipos de: ${g.nombre}` : 'Equipos';
  });

  // ── Formularios ───────────────────────────────────────────────────────────

  readonly formGerencia = this.fb.group({
    nombre: this.fb.nonNullable.control('', Validators.required),
  });

  readonly formEquipo = this.fb.group({
    nombre: this.fb.nonNullable.control('', Validators.required),
    siglas: this.fb.nonNullable.control('', Validators.required),
    centroCosto: this.fb.nonNullable.control('', Validators.required),
  });

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.cargarGerencias();
  }

  // ── Gerencias ──────────────────────────────────────────────────────────────

  cargarGerencias(): void {
    this.cargandoGerencias.set(true);
    this.svc.getGerencias()
      .pipe(finalize(() => this.cargandoGerencias.set(false)))
      .subscribe({
        next: g => this.gerencias.set(g.data),
        error: () => this.toast('error', 'Error', 'No se pudieron cargar las gerencias.'),
      });
  }

  seleccionarGerencia(g: GerenciaDTO): void {
    this.gerenciaSeleccionada.set(g);
    this.cargarEquipos(g.id);
  }

  abrirNuevaGerencia(): void {
    this.gerenciaEnEdicion.set(null);
    this.formGerencia.reset();
    this.dialogGerenciaVisible.set(true);
  }

  editarGerencia(g: GerenciaDTO, event: Event): void {
    event.stopPropagation();
    this.gerenciaEnEdicion.set(g);
    this.formGerencia.patchValue({ nombre: g.nombre });
    this.dialogGerenciaVisible.set(true);
  }

  guardarGerencia(): void {
    if (this.formGerencia.invalid) {
      this.formGerencia.markAllAsTouched();
      return;
    }
    this.guardandoGerencia.set(true);

    const raw: GerenciaCreateDTO = this.formGerencia.getRawValue();
    const enEdicion = this.gerenciaEnEdicion();

    const observer = {
      next: () => {
        this.toast('success', enEdicion ? 'Actualizado' : 'Creado', 'Gerencia guardada correctamente.');
        this.dialogGerenciaVisible.set(false);
        this.cargarGerencias();
      },
      error: (err: any) =>
        this.toast('error', 'Error al guardar', err.error?.mensaje ?? 'No se pudo guardar la gerencia.')
    };

    if (enEdicion) {
      this.svc.updateGerencia(enEdicion.id, raw as GerenciaUpdateDTO)
        .pipe(finalize(() => this.guardandoGerencia.set(false)))
        .subscribe(observer);
    } else {
      this.svc.createGerencia(raw)
        .pipe(finalize(() => this.guardandoGerencia.set(false)))
        .subscribe(observer);
    }
  }

  eliminarGerencia(g: GerenciaDTO, event: Event): void {
    event.stopPropagation();
    this.actionService.ejecutar({
      header: 'Confirmar baja lógica',
      message: `¿Dar de baja la gerencia "<b>${g.nombre}</b>"? La acción es no reversible.`,
      icon: 'pi pi-exclamation-triangle',
      acceptClass: 'p-button-danger p-button-sm',
      action: () => this.svc.deleteGerencia(g.id),
      onSuccess: () => {
        if (this.gerenciaSeleccionada()?.id === g.id) {
          this.gerenciaSeleccionada.set(null);
          this.equipos.set([]);
        }
        this.cargarGerencias();
      },
      // 👇 ESTO ES LO QUE CLAUDE SE NEGABA A AGREGAR 👇
      onError: (err: any) => {
        const mensaje = err.error?.mensaje || err.error?.message || 'No se puede eliminar la gerencia.';
        this.toast('error', 'Operación denegada', mensaje);
      }
    });
  }

  // ── Equipos ────────────────────────────────────────────────────────────────

  private cargarEquipos(idGerencia: number): void {
    this.cargandoEquipos.set(true);
    this.svc.getEquipos(idGerencia)
      .pipe(finalize(() => this.cargandoEquipos.set(false)))
      .subscribe({
        next: e => this.equipos.set(e.data),
        error: () => this.toast('error', 'Error', 'No se pudieron cargar los equipos.'),
      });
  }

  abrirNuevoEquipo(): void {
    this.equipoEnEdicion.set(null);
    this.formEquipo.reset();
    this.dialogEquipoVisible.set(true);
  }

  editarEquipo(e: EquipoDTO): void {
    this.equipoEnEdicion.set(e);
    this.formEquipo.patchValue({
      nombre: e.nombre,
      siglas: e.siglas,
      centroCosto: e.centroCosto,
    });
    this.dialogEquipoVisible.set(true);
  }

  guardarEquipo(): void {
    if (this.formEquipo.invalid) {
      this.formEquipo.markAllAsTouched();
      return;
    }
    const ger = this.gerenciaSeleccionada()!;
    this.guardandoEquipo.set(true);

    const raw: EquipoCreateDTO = this.formEquipo.getRawValue();
    const enEdicion = this.equipoEnEdicion();

    const observer = {
      next: () => {
        this.toast('success', enEdicion ? 'Actualizado' : 'Creado', 'Equipo guardado correctamente.');
        this.dialogEquipoVisible.set(false);
        this.cargarEquipos(ger.id);
      },
      error: (err: any) =>
        this.toast('error', 'Error al guardar', err.error?.mensaje ?? 'No se pudo guardar el equipo.')
    };

    if (enEdicion) {
      this.svc.updateEquipo(enEdicion.id, raw as EquipoUpdateDTO)
        .pipe(finalize(() => this.guardandoEquipo.set(false)))
        .subscribe(observer);
    } else {
      this.svc.createEquipo(ger.id, raw)
        .pipe(finalize(() => this.guardandoEquipo.set(false)))
        .subscribe(observer);
    }
  }

  eliminarEquipo(e: EquipoDTO, event: Event): void {
    event.stopPropagation();
    const ger = this.gerenciaSeleccionada()!;
    this.actionService.ejecutar({
      header: 'Confirmar baja lógica',
      message: `¿Dar de baja el equipo "<b>${e.nombre}</b>"? La acción es no reversible.`,
      icon: 'pi pi-exclamation-triangle',
      acceptClass: 'p-button-danger p-button-sm',
      action: () => this.svc.deleteEquipo(e.id),
      onSuccess: () => this.cargarEquipos(ger.id),
      // 👇 Y ESTO TAMBIÉN 👇
      onError: (err: any) => {
        const mensaje = err.error?.mensaje || err.error?.message || 'No se puede eliminar el equipo.';
        this.toast('error', 'Operación denegada', mensaje);
      }
    });
  }

  // ── Privados ──────────────────────────────────────────────────────────────

  private toast(severity: string, summary: string, detail: string): void {
    this.msg.add({ severity, summary, detail, life: 4000 });
  }
}
