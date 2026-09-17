import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { switchMap, of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Dialog } from 'primeng/dialog';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

import { ActionOrchestratorService } from '../../../shared/services/action-orchestrator.service';
import { MaestraService } from '../../../core/services/maestra.service';
import { PersonalInternoService } from './personal-interno.service';
import {
  PersonalInternoResponseDTO,
  PersonalInternoRequestDTO,
} from './personal-interno.model';
import { ConceptoDTO } from '../../../core/models/maestra.model';

type Modo = 'NUEVO' | 'EDITAR';

@Component({
  selector: 'app-personal-interno',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    Select,
    Dialog,
    Toast,
    ConfirmDialog,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './personal-interno.component.html',
  styleUrl: './personal-interno.component.scss',
})
export class PersonalInternoComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(PersonalInternoService);
  private readonly maestra = inject(MaestraService);
  private readonly msg = inject(MessageService);
  private readonly actionService = inject(ActionOrchestratorService);

  // ── Estado reactivo ───────────────────────────────────────────────────────

  readonly personalList = signal<PersonalInternoResponseDTO[]>([]);
  readonly rolesProyecto = signal<ConceptoDTO[]>([]);

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly modalVisible = signal(false);

  readonly modo = signal<Modo>('NUEVO');
  readonly idSeleccionado = signal<number | null>(null);

  readonly tituloModal = computed(() =>
    this.modo() === 'NUEVO' ? 'Nuevo Personal' : 'Editar Personal'
  );

  readonly labelBtn = computed(() =>
    this.modo() === 'NUEVO' ? 'Guardar' : 'Actualizar'
  );

  // ── Formulario ────────────────────────────────────────────────────────────

  readonly form = this.fb.group({
    idUsuario: this.fb.nonNullable.control<number | null>(null),
    dni: this.fb.nonNullable.control('', Validators.required),
    nombresApellidos: this.fb.nonNullable.control('', Validators.required),
    correo: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.email,
    ]),
    codRolProyecto: this.fb.nonNullable.control('', Validators.required),
    idGerencia: this.fb.nonNullable.control<number | null>(null, Validators.required),
    idEquipo: this.fb.nonNullable.control<number | null>(null, Validators.required),
  });

  // ── Combos en Cascada ──────────────────────────────────────────────────────

  readonly gerencias = toSignal(this.maestra.getGerencias(), { initialValue: [] });

  readonly equipos = toSignal(
    this.form.controls.idGerencia.valueChanges.pipe(
      switchMap(id => {
        this.form.controls.idEquipo.reset(null, { emitEvent: false });
        return id != null ? this.maestra.getEquipos(id) : of([]);
      })
    ),
    { initialValue: [] }
  );

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarPersonal();
  }

  // ── Carga de datos ────────────────────────────────────────────────────────

  private cargarCatalogos(): void {
    this.maestra.getConceptos('ROL_PRY').subscribe({
      next: roles => this.rolesProyecto.set(roles),
      error: () =>
        this.toast('error', 'Error', 'No se pudieron cargar los roles.'),
    });
  }

  cargarPersonal(): void {
    this.cargando.set(true);
    this.svc.listar().subscribe({
      next: res => {
        this.personalList.set(res.data);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast('error', 'Error', 'No se pudieron cargar el personal.');
      },
    });
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  abrirNuevo(): void {
    this.modo.set('NUEVO');
    this.idSeleccionado.set(null);
    this.form.reset();
    this.modalVisible.set(true);
  }

  editar(item: PersonalInternoResponseDTO): void {
    console.log('🐞 [DEBUG] Objeto a editar:', item);
    this.modo.set('EDITAR');
    this.idSeleccionado.set(item.id);

    // Paso 1: Cargar campos principales y GERENCIA (dispara switchMap de equipos)
    this.form.patchValue({
      idUsuario: item.idUsuario,
      dni: item.dni,
      nombresApellidos: item.nombresApellidos,
      correo: item.correo,
      codRolProyecto: item.codRolProyecto,
      idGerencia: item.idGerencia,
    }, { emitEvent: true });

    // Paso 2: Después que los equipos se carguen, settear el equipo específico
    setTimeout(() => {
      this.form.patchValue({
        idEquipo: item.idEquipo,
      }, { emitEvent: false });
    }, 100);

    this.modalVisible.set(true);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const formValue = this.form.getRawValue();

    // Construir payload sin idGerencia (solo para la UI)
    const payload: PersonalInternoRequestDTO = {
      idUsuario: formValue.idUsuario,
      dni: formValue.dni,
      nombresApellidos: formValue.nombresApellidos,
      correo: formValue.correo,
      codRolProyecto: formValue.codRolProyecto,
      idEquipo: formValue.idEquipo,
    };
    const id = this.idSeleccionado();

    const observer = {
      next: () => {
        this.toast(
          'success',
          id ? 'Actualizado' : 'Creado',
          'Personal guardado correctamente.'
        );
        this.modalVisible.set(false);
        this.cargarPersonal();
      },
      error: (err: any) => {
        const mensaje =
          err.error?.mensaje ||
          err.error?.message ||
          'No se pudo guardar el personal.';
        this.toast('error', 'Error de Validación', mensaje);
      },
      complete: () => this.guardando.set(false),
    };

    if (id) {
      this.svc.actualizar(id, payload).subscribe(observer);
    } else {
      this.svc.crear(payload).subscribe(observer);
    }
  }

  eliminar(item: PersonalInternoResponseDTO): void {
    this.actionService.ejecutar({
      header: 'Confirmar eliminación',
      message: `¿Eliminar a "<b>${item.nombresApellidos}</b>"? La acción es no reversible.`,
      icon: 'pi pi-exclamation-triangle',
      acceptClass: 'p-button-danger p-button-sm',
      action: () => this.svc.eliminar(item.id),
      onSuccess: () => {
        this.toast('success', 'Eliminado', 'Personal eliminado correctamente.');
        this.cargarPersonal();
      },
      onError: (err: any) => {
        const mensaje =
          err.error?.mensaje ||
          err.error?.message ||
          'No se pudo eliminar el personal.';
        this.toast('error', 'Operación denegada', mensaje);
      },
    });
  }

  // ── Utilidades ────────────────────────────────────────────────────────────

  private toast(severity: string, summary: string, detail: string): void {
    this.msg.add({ severity, summary, detail, life: 4000 });
  }
}
