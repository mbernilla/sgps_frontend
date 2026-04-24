import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize, map } from 'rxjs/operators';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { Dialog } from 'primeng/dialog';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { PrimeTemplate, ConfirmationService, MessageService } from 'primeng/api';

import { MaestraService } from '../../../core/services/maestra.service';
import { SistemasService } from './sistemas.service';
import { SistemaAdminDTO, ModuloAdminDTO, SistemaCreateDTO, ModuloCreateDTO, GrupoTecOpt } from './sistemas.models';

@Component({
  selector: 'app-sistemas-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    Select,
    Textarea,
    Dialog,
    Toast,
    ConfirmDialog,
    PrimeTemplate,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './sistemas-admin.html',
  styleUrl: './sistemas-admin.scss',
})
export class SistemasAdminComponent implements OnInit {

  private readonly fb      = inject(FormBuilder);
  private readonly svc     = inject(SistemasService);
  private readonly maestra = inject(MaestraService);
  private readonly msg     = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  // ── Estado reactivo ───────────────────────────────────────────────────────

  readonly sistemas            = signal<SistemaAdminDTO[]>([]);
  readonly modulos             = signal<ModuloAdminDTO[]>([]);
  readonly sistemaSeleccionado = signal<SistemaAdminDTO | null>(null);
  readonly grupoTecOpts        = signal<GrupoTecOpt[]>([]);

  readonly cargandoSistemas = signal(false);
  readonly cargandoModulos  = signal(false);
  readonly guardandoSistema = signal(false);
  readonly guardandoModulo  = signal(false);

  readonly modalSistema = signal(false);
  readonly modalModulo  = signal(false);

  readonly sistemaEnEdicion = signal<SistemaAdminDTO | null>(null);
  readonly moduloEnEdicion  = signal<ModuloAdminDTO  | null>(null);

  readonly tituloModalSistema = computed(() => this.sistemaEnEdicion() ? 'Editar Sistema'  : 'Nuevo Sistema');
  readonly tituloModalModulo  = computed(() => this.moduloEnEdicion()  ? 'Editar Módulo'   : 'Nuevo Módulo');
  readonly labelBtnSistema    = computed(() => this.sistemaEnEdicion() ? 'Actualizar'      : 'Guardar');
  readonly labelBtnModulo     = computed(() => this.moduloEnEdicion()  ? 'Actualizar'      : 'Guardar');

  // ── Formularios ───────────────────────────────────────────────────────────

  readonly formSistema = this.fb.group({
    nombre:              this.fb.nonNullable.control('', Validators.required),
    descripcion:         this.fb.nonNullable.control(''),
    codGrupoTecnologico: this.fb.nonNullable.control('', Validators.required),
  });

  readonly formModulo = this.fb.group({
    nombre: this.fb.nonNullable.control('', Validators.required),
  });

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.cargarGruposTec();
    this.cargarSistemas();
  }

  // ── Sistemas ──────────────────────────────────────────────────────────────

  cargarSistemas(): void {
    this.cargandoSistemas.set(true);
    this.svc.getSistemas()
      .pipe(finalize(() => this.cargandoSistemas.set(false)))
      .subscribe({
        next:  s  => this.sistemas.set(s),
        error: () => this.toast('error', 'Error', 'No se pudieron cargar los sistemas.'),
      });
  }

  seleccionarSistema(s: SistemaAdminDTO): void {
    this.sistemaSeleccionado.set(s);
    this.cargarModulos(s.id);
  }

  abrirNuevoSistema(): void {
    this.sistemaEnEdicion.set(null);
    this.formSistema.reset();
    this.modalSistema.set(true);
  }

  editarSistema(s: SistemaAdminDTO, event: Event): void {
    event.stopPropagation();
    this.sistemaEnEdicion.set(s);
    this.formSistema.patchValue({
      nombre:              s.nombre,
      descripcion:         s.descripcion,
      codGrupoTecnologico: s.codGrupoTecnologico,
    });
    this.modalSistema.set(true);
  }

  guardarSistema(): void {
    if (this.formSistema.invalid) { this.formSistema.markAllAsTouched(); return; }
    this.guardandoSistema.set(true);

    const raw: SistemaCreateDTO = this.formSistema.getRawValue();
    const enEdicion = this.sistemaEnEdicion();

    // Extraemos la respuesta (observer) para no repetir código
    const observer = {
      next: () => {
        this.toast('success', enEdicion ? 'Actualizado' : 'Creado', 'Sistema guardado correctamente.');
        this.modalSistema.set(false);
        this.cargarSistemas();
      },
      error: (err: any) => this.toast('error', 'Error al guardar', err.error?.mensaje ?? 'No se pudo guardar el sistema.')
    };

    // Separamos las rutas para que RxJS y TypeScript no se confundan con los tipos
    if (enEdicion) {
      this.svc.updateSistema(enEdicion.id, raw)
        .pipe(finalize(() => this.guardandoSistema.set(false)))
        .subscribe(observer);
    } else {
      this.svc.createSistema(raw)
        .pipe(finalize(() => this.guardandoSistema.set(false)))
        .subscribe(observer);
    }
  }

  eliminarSistema(s: SistemaAdminDTO, event: Event): void {
    event.stopPropagation();
    this.confirm.confirm({
      message:               `¿Dar de baja el sistema "<b>${s.nombre}</b>"? La acción es reversible.`,
      header:                'Confirmar baja lógica',
      icon:                  'pi pi-exclamation-triangle',
      acceptLabel:           'Sí, dar de baja',
      rejectLabel:           'Cancelar',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-text p-button-sm',
      accept: () => {
        this.svc.deleteSistema(s.id).subscribe({
          next: () => {
            this.toast('success', 'Baja registrada', `El sistema "${s.nombre}" fue dado de baja.`);
            if (this.sistemaSeleccionado()?.id === s.id) {
              this.sistemaSeleccionado.set(null);
              this.modulos.set([]);
            }
            this.cargarSistemas();
          },
          error: err => this.toast('error', 'Error', err.error?.mensaje ?? 'No se pudo dar de baja el sistema.'),
        });
      },
    });
  }

  // ── Módulos ───────────────────────────────────────────────────────────────

  private cargarModulos(idSistema: number): void {
    this.cargandoModulos.set(true);
    this.svc.getModulos(idSistema)
      .pipe(finalize(() => this.cargandoModulos.set(false)))
      .subscribe({
        next:  m  => this.modulos.set(m),
        error: () => this.toast('error', 'Error', 'No se pudieron cargar los módulos.'),
      });
  }

  abrirNuevoModulo(): void {
    this.moduloEnEdicion.set(null);
    this.formModulo.reset();
    this.modalModulo.set(true);
  }

  editarModulo(m: ModuloAdminDTO): void {
    this.moduloEnEdicion.set(m);
    this.formModulo.patchValue({ nombre: m.nombre });
    this.modalModulo.set(true);
  }

  guardarModulo(): void {
    if (this.formModulo.invalid) { this.formModulo.markAllAsTouched(); return; }
    const sis = this.sistemaSeleccionado()!;
    this.guardandoModulo.set(true);

    const raw: ModuloCreateDTO = this.formModulo.getRawValue();
    const enEdicion = this.moduloEnEdicion();

    // Extraemos la respuesta (observer)
    const observer = {
      next: () => {
        this.toast('success', enEdicion ? 'Actualizado' : 'Creado', 'Módulo guardado correctamente.');
        this.modalModulo.set(false);
        this.cargarModulos(sis.id);
      },
      error: (err: any) => this.toast('error', 'Error al guardar', err.error?.mensaje ?? 'No se pudo guardar el módulo.')
    };

    // Separamos las rutas de RxJS
    if (enEdicion) {
      this.svc.updateModulo(sis.id, enEdicion.id, raw)
        .pipe(finalize(() => this.guardandoModulo.set(false)))
        .subscribe(observer);
    } else {
      this.svc.createModulo(sis.id, raw)
        .pipe(finalize(() => this.guardandoModulo.set(false)))
        .subscribe(observer);
    }
  }

  eliminarModulo(m: ModuloAdminDTO): void {
    const sis = this.sistemaSeleccionado()!;
    this.confirm.confirm({
      message:               `¿Dar de baja el módulo "<b>${m.nombre}</b>"?`,
      header:                'Confirmar baja lógica',
      icon:                  'pi pi-exclamation-triangle',
      acceptLabel:           'Sí, dar de baja',
      rejectLabel:           'Cancelar',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-text p-button-sm',
      accept: () => {
        this.svc.deleteModulo(sis.id, m.id).subscribe({
          next: () => {
            this.toast('success', 'Baja registrada', `El módulo "${m.nombre}" fue dado de baja.`);
            this.cargarModulos(sis.id);
          },
          error: err => this.toast('error', 'Error', err.error?.mensaje ?? 'No se pudo dar de baja el módulo.'),
        });
      },
    });
  }

  // ── Privados ──────────────────────────────────────────────────────────────

  /**
   * Carga los grupos tecnológicos desde el maestro de conceptos (GRP_TEC).
   * El backend devuelve {id: 'GT1', nombre: 'GT1 (SAP, ERP)'} vía LookupResponseDTO.
   * Se castea al tipo local GrupoTecOpt para evitar conflictos con ConceptoDTO del core.
   */
  private cargarGruposTec(): void {
    this.maestra.getConceptos('GRP_TEC')
      .pipe(map(lista => lista as unknown as GrupoTecOpt[]))
      .subscribe({
        next:  opts => this.grupoTecOpts.set(opts),
        error: ()   => this.toast('warn', 'Advertencia', 'No se cargaron los grupos tecnológicos.'),
      });
  }

  private toast(severity: string, summary: string, detail: string): void {
    this.msg.add({ severity, summary, detail, life: 4000 });
  }
}
