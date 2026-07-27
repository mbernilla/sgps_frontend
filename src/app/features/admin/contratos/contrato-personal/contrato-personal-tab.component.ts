import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

import { ActionOrchestratorService } from '../../../../shared/services/action-orchestrator.service';
import { MaestraService } from '../../../../core/services/maestra.service';
import { ContratoPersonalService } from './contrato-personal.service';
import {
  PersonalDTO,
  PersonalRequestDTO,
  UsuarioComboDTO,
} from './contrato-personal.model';
import { ConceptoDTO } from '../../../../core/models/maestra.model';

@Component({
  selector: 'app-contrato-personal-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    Select,
    Dialog,
    Toast,
    ConfirmDialog,
    DatePickerModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './contrato-personal-tab.component.html',
  styleUrl: './contrato-personal-tab.component.scss',
})
export class ContratoPersonalTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(ContratoPersonalService);
  private readonly maestra = inject(MaestraService);
  private readonly msg = inject(MessageService);
  private readonly actionService = inject(ActionOrchestratorService);

  // ── Input Signal ───────────────────────────────────────────────────────────

  readonly contratoId = input.required<number>();

  // ── Estado reactivo ───────────────────────────────────────────────────────

  readonly personal = signal<PersonalDTO[]>([]);
  readonly rolesProyecto = signal<ConceptoDTO[]>([]);
  readonly usuariosFabrica = signal<UsuarioComboDTO[]>([]);

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly dialogVisible = signal(false);

  readonly personalEnEdicion = signal<PersonalDTO | null>(null);

  readonly tituloModal = computed(() =>
    this.personalEnEdicion() ? 'Editar Personal' : 'Nuevo Personal'
  );
  readonly labelBtn = computed(() =>
    this.personalEnEdicion() ? 'Actualizar' : 'Guardar'
  );

  readonly filtroGlobal = signal<string>('');

  readonly personalFiltrado = computed(() => {
    const filtro = this.filtroGlobal().toLowerCase();
    if (!filtro) return this.personal();

    return this.personal().filter(
      p =>
        p.dni.toLowerCase().includes(filtro) ||
        p.nombresApellidos.toLowerCase().includes(filtro) ||
        p.correo.toLowerCase().includes(filtro) ||
        p.rolDescripcion.toLowerCase().includes(filtro)
    );
  });

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
    fechaAlta: this.fb.nonNullable.control<Date | null>(null, Validators.required),
    fechaBaja: this.fb.nonNullable.control<Date | null>(null),
  });

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  constructor() {
    effect(() => {
      const id = this.contratoId();
      if (id) {
        this.cargarPersonal(); // o el método que haya puesto Claude
      }
    });
  }

  ngOnInit(): void {
    this.cargarRoles();

    // Lógica híbrida: cuando cambia idUsuario, autocompletar
    this.form
      // .get('idUsuario')
      // ?.valueChanges.subscribe((idUsuario: number | null) => {
      //   if (idUsuario) {
      //     const usuario = this.usuariosFabrica().find(u => u.id === idUsuario);
      //     if (usuario) {
      //       this.form.patchValue({
      //         dni: usuario.dni,
      //         nombresApellidos: usuario.nombre,
      //         correo: usuario.correo,
      //       });
      //       this.form.get('dni')?.disable();
      //       this.form.get('nombresApellidos')?.disable();
      //       this.form.get('correo')?.disable();
      //     }
      //   } else {
      //     this.form.patchValue({
      //       dni: '',
      //       nombresApellidos: '',
      //       correo: '',
      //     });
      //     this.form.get('dni')?.enable();
      //     this.form.get('nombresApellidos')?.enable();
      //     this.form.get('correo')?.enable();
      //   }
      // });

    // Effect para cargar datos cuando contratoId esté disponible

  }

  // ── Carga de datos ────────────────────────────────────────────────────────

  private cargarRoles(): void {
    this.maestra.getConceptos('ROL_PRY').subscribe({
      next: roles => this.rolesProyecto.set(roles),
      error: () =>
        this.toast(
          'error',
          'Error',
          'No se pudieron cargar los roles del proyecto.'
        ),
    });
  }

  private cargarUsuarios(): void {
    this.svc.getUsuariosFabrica(this.contratoId()).subscribe({
      next: res => this.usuariosFabrica.set(res.data),
      error: () =>
        this.toast(
          'error',
          'Error',
          'No se pudieron cargar los usuarios de la fábrica.'
        ),
    });
  }

  cargarPersonal(): void {
    this.cargando.set(true);
    this.svc.getPersonal(this.contratoId()).subscribe({
      next: res => {
        this.personal.set(res.data);
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
    this.personalEnEdicion.set(null);
    this.form.reset();
    this.form.get('dni')?.enable();
    this.form.get('nombresApellidos')?.enable();
    this.form.get('correo')?.enable();
    this.dialogVisible.set(true);
  }

  editar(p: PersonalDTO, event: Event): void {
    event.stopPropagation();
    this.personalEnEdicion.set(p);

    const fechaAlta = p.fechaAlta ? new Date(p.fechaAlta + 'T00:00:00') : null;
    const fechaBaja = p.fechaBaja ? new Date(p.fechaBaja + 'T00:00:00') : null;

    this.form.patchValue({
      idUsuario: p.idUsuario,
      dni: p.dni,
      nombresApellidos: p.nombresApellidos,
      correo: p.correo,
      codRolProyecto: p.codRolProyecto,
      fechaAlta,
      fechaBaja,
    });

    if (p.idUsuario) {
      this.form.get('dni')?.disable();
      this.form.get('nombresApellidos')?.disable();
      this.form.get('correo')?.disable();
    }

    this.dialogVisible.set(true);
  }

  guardarPersonal(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const rawValue = this.form.getRawValue();

    const payload: PersonalRequestDTO = {
      idUsuario: rawValue.idUsuario,
      dni: rawValue.dni,
      nombresApellidos: rawValue.nombresApellidos,
      correo: rawValue.correo,
      codRolProyecto: rawValue.codRolProyecto,
      fechaAlta: this.formatearFecha(rawValue.fechaAlta),
      fechaBaja: rawValue.fechaBaja
        ? this.formatearFecha(rawValue.fechaBaja)
        : null,
    };

    const enEdicion = this.personalEnEdicion();

    const observer = {
      next: () => {
        this.toast(
          'success',
          enEdicion ? 'Actualizado' : 'Creado',
          'Personal guardado correctamente.'
        );
        this.dialogVisible.set(false);
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

    if (enEdicion) {
      this.svc
        .updatePersonal(enEdicion.id, this.contratoId(), payload)
        .subscribe(observer);
    } else {
      this.svc.createPersonal(this.contratoId(), payload).subscribe(observer);
    }
  }

  eliminarPersonal(p: PersonalDTO, event: Event): void {
    event.stopPropagation();

    this.actionService.ejecutar({
      header: 'Confirmar baja lógica',
      message: `¿Dar de baja al personal "<b>${p.nombresApellidos}</b>"? La acción es no reversible.`,
      icon: 'pi pi-exclamation-triangle',
      acceptClass: 'p-button-danger p-button-sm',
      action: () =>
        this.svc.deletePersonal(p.id, this.contratoId()),
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

  private formatearFecha(fecha: Date | null): string {
    if (!fecha) return '';
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toast(severity: string, summary: string, detail: string): void {
    this.msg.add({ severity, summary, detail, life: 4000 });
  }
}
