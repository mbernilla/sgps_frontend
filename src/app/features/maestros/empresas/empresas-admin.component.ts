import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Dialog } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

import { ActionOrchestratorService } from '../../../shared/services/action-orchestrator.service';
import { MaestraService } from '../../../core/services/maestra.service';
import { EmpresasService } from './empresas.service';
import { EmpresaResponseDTO, EmpresaRequestDTO } from './empresas.models';
import { ConceptoDTO } from '../../../core/models/maestra.model';

@Component({
  selector: 'app-empresas-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    Dialog,
    SelectModule,
    Toast,
    ConfirmDialog,
    FormsModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './empresas-admin.component.html',
  styleUrl: './empresas-admin.component.scss',
})
export class EmpresasAdminComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(EmpresasService);
  private readonly maestra = inject(MaestraService);
  private readonly msg = inject(MessageService);
  private readonly actionService = inject(ActionOrchestratorService);

  // ── Estado reactivo ───────────────────────────────────────────────────────

  readonly empresas = signal<EmpresaResponseDTO[]>([]);
  readonly tiposEmpresa = signal<ConceptoDTO[]>([]);

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly dialogVisible = signal(false);

  readonly empresaEnEdicion = signal<EmpresaResponseDTO | null>(null);

  readonly tituloModal = computed(() =>
    this.empresaEnEdicion() ? 'Editar Empresa' : 'Nueva Empresa'
  );
  readonly labelBtn = computed(() =>
    this.empresaEnEdicion() ? 'Actualizar' : 'Guardar'
  );

  readonly filtroGlobal = signal<string>('');

  readonly empresasFiltradas = computed(() => {
    const filtro = this.filtroGlobal().toLowerCase();
    if (!filtro) return this.empresas();

    return this.empresas().filter(emp =>
      emp.ruc.toLowerCase().includes(filtro) ||
      emp.razonSocial.toLowerCase().includes(filtro) ||
      emp.tipoDescripcion.toLowerCase().includes(filtro)
    );
  });

  // ── Formulario ────────────────────────────────────────────────────────────

  readonly form = this.fb.group({
    ruc: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(10)]),
    razonSocial: this.fb.nonNullable.control('', Validators.required),
    codTipo: this.fb.nonNullable.control('', Validators.required),
  });

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.cargarTipos();
    this.cargarEmpresas();
  }

  // ── Carga de datos ────────────────────────────────────────────────────────

  private cargarTipos(): void {
    this.maestra.getConceptos('TIP_EMP').subscribe({
      next: tipos =>
        {
          console.log('Conceptos:', tipos);
          this.tiposEmpresa.set(tipos)
        },
      error: () => this.toast('error', 'Error', 'No se pudieron cargar los tipos de empresa.'),
    });
  }

  cargarEmpresas(): void {
    this.cargando.set(true);
    this.svc.getEmpresas().subscribe({
      next: res => {
        this.empresas.set(res.data);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast('error', 'Error', 'No se pudieron cargar las empresas.');
      },
    });
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  abrirNueva(): void {
    this.empresaEnEdicion.set(null);
    this.form.reset();
    this.dialogVisible.set(true);
  }

  editar(emp: EmpresaResponseDTO, event: Event): void {
    event.stopPropagation();
    this.empresaEnEdicion.set(emp);
    this.form.patchValue({
      ruc: emp.ruc,
      razonSocial: emp.razonSocial,
      codTipo: emp.codTipo,
    });
    this.dialogVisible.set(true);
  }

  guardarEmpresa(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);

    const raw: EmpresaRequestDTO = this.form.getRawValue();
    const enEdicion = this.empresaEnEdicion();

    const observer = {
      next: () => {
        this.toast('success', enEdicion ? 'Actualizado' : 'Creado', 'Empresa guardada correctamente.');
        this.dialogVisible.set(false);
        this.cargarEmpresas();
      },
      error: (err: any) => {
        const mensaje = err.error?.mensaje || err.error?.message || 'No se pudo guardar la empresa.';
        this.toast('error', 'Error de Validación', mensaje);
        // NO cerramos el modal para que el usuario pueda corregir
      },
      complete: () => this.guardando.set(false)
    };

    if (enEdicion) {
      this.svc.updateEmpresa(enEdicion.id, raw).subscribe(observer);
    } else {
      this.svc.createEmpresa(raw).subscribe(observer);
    }
  }

  eliminarEmpresa(emp: EmpresaResponseDTO, event: Event): void {
    event.stopPropagation();
    this.actionService.ejecutar({
      header: 'Confirmar baja lógica',
      message: `¿Dar de baja la empresa "<b>${emp.razonSocial}</b>"? La acción es no reversible.`,
      icon: 'pi pi-exclamation-triangle',
      acceptClass: 'p-button-danger p-button-sm',
      action: () => this.svc.deleteEmpresa(emp.id),
      onSuccess: () => {
        this.toast('success', 'Eliminado', 'Empresa eliminada correctamente.');
        this.cargarEmpresas();
      },
      onError: (err: any) => {
        const mensaje = err.error?.mensaje || err.error?.message || 'No se pudo eliminar.';
        this.toast('error', 'Operación denegada', mensaje);
      }
    });
  }

  // ── Privados ──────────────────────────────────────────────────────────────

  private toast(severity: string, summary: string, detail: string): void {
    this.msg.add({ severity, summary, detail, life: 4000 });
  }
}
