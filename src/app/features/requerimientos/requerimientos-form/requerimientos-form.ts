import { Component, inject, effect, signal, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router'; // <-- Añadido ActivatedRoute
import {
  ReactiveFormsModule,
  FormBuilder,
  FormArray,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { switchMap, of } from 'rxjs';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Imports de PrimeNG
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Toast } from 'primeng/toast';
import { Checkbox } from 'primeng/checkbox';
import { MultiSelectModule } from 'primeng/multiselect'; // <-- Añadido para Tecnologías
import { AutoCompleteModule } from 'primeng/autocomplete'; // <-- Añadido para Personal
import { MessageService } from 'primeng/api';

import { FormSelectComponent } from '../../../shared/components/form-select/form-select';
import { MaestraService } from '../../../core/services/maestra.service';
import { RequerimientoService } from '../requerimiento.service';
import {
  RequerimientoRegistroRequestDTO,
  DistribucionCostoDTO,
  PersonalDTO,
  TecnologiaDTO,
} from '../requerimiento.model';
import {
  EquipoDTO,
  ModuloDTO,
  TecnologiaDTO as MaestraTecnologiaDTO,
  PersonalDTO as MaestraPersonalDTO
} from '../../../core/models/maestra.model';

// ── Custom Validator: suma de porcentajes debe ser 100 ────────────────────────
function sumaPorcentajeValidator(control: AbstractControl): ValidationErrors | null {
  const array = control as FormArray;
  if (array.length === 0) return null;
  const suma = array.controls.reduce(
    (acc, g) => acc + (Number(g.get('porcentaje')?.value) || 0),
    0
  );
  return Math.abs(suma - 100) < 0.01 ? null : { sumaPorcentaje: { actual: suma } };
}

// ── Opciones estáticas ────────────────────────────────────────────────────────
const ESTADO_OPTS = [
  { label: 'Pendiente', value: 'REQ_REG' },
  { label: 'En progreso', value: 'REQ_CUR' },
  { label: 'Completado', value: 'REQ_ATE' },
];

@Component({
  selector: 'app-requerimientos-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormSelectComponent,
    Select,
    DatePicker,
    Button,
    InputText,
    Textarea,
    Toast,
    Checkbox,
    MultiSelectModule, // <-- Añadido
    AutoCompleteModule // <-- Añadido
  ],
  providers: [MessageService],
  templateUrl: './requerimientos-form.html',
  styleUrl: './requerimientos-form.scss',
})
export class RequerimientosFormComponent implements OnInit {

  // ── Servicios ─────────────────────────────────────────────────────────
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute); // <-- Inyectado para leer URL
  private readonly service = inject(RequerimientoService);
  private readonly maestra = inject(MaestraService);
  private readonly msg = inject(MessageService);

  readonly equiposPorGerencia = signal<Record<number, EquipoDTO[]>>({});

  // ── Estado del Formulario (Modos) ─────────────────────────────────────
  reqId: number | null = null;
  modo: 'NUEVO' | 'EDITAR' | 'VER' = 'NUEVO';

  // ── Señales para las maestras extras ──────────────────────────────────
  listaTecnologias = signal<MaestraTecnologiaDTO[]>([]);
  listaPersonal = signal<MaestraPersonalDTO[]>([]);
  personalFiltrado = signal<MaestraPersonalDTO[]>([]);

  // ── Opciones estáticas ────────────────────────────────────────────────
  readonly estadoOpts = ESTADO_OPTS;

  // ── Formulario principal ──────────────────────────────────────────────
  readonly form = this.fb.group({
    idContrato: this.fb.control<number | null>(null, Validators.required),
    idFabrica: this.fb.control<number | null>(null),
    idGerencia: this.fb.control<number | null>(null, Validators.required),
    idEquipo: this.fb.control<number | null>(null, Validators.required),
    idSistema: this.fb.control<number | null>(null, Validators.required),
    idModulo: this.fb.control<number | null>(null, Validators.required),
    codCriticidad: this.fb.nonNullable.control('CRI_MED', Validators.required),
    codGrupoTecnologico: this.fb.nonNullable.control('GT1', Validators.required),
    codExterno: this.fb.nonNullable.control(''),
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    descripcion: this.fb.nonNullable.control('', Validators.required),
    fechaSolicitud: this.fb.control<Date | null>(null, Validators.required),
    fechaInicio: this.fb.control<Date | null>(null),
    tipoRequerimiento: this.fb.nonNullable.control('', Validators.required),
    prioridad: this.fb.nonNullable.control('', Validators.required),
    estado: this.fb.nonNullable.control('REQ_REG', Validators.required),
    distribucionCostos: this.fb.array<FormGroup>([], sumaPorcentajeValidator),
    personal: this.fb.array([]),
    tecnologias: this.fb.control<number[]>([], Validators.required), // <-- Cambiado a array de números
  });

  // ── Señales: valores de controles clave ───────────────────────────────
  private readonly idContratoValue = toSignal(
    this.form.controls.idContrato.valueChanges,
    { initialValue: null as number | null }
  );

  // ── Señales: maestras estáticas ───────────────────────────────────────
  readonly gerencias = toSignal(this.maestra.getGerencias(), { initialValue: [] });
  readonly sistemas = toSignal(this.maestra.getSistemas(), { initialValue: [] });
  readonly contratos = toSignal(this.maestra.getContratos(), { initialValue: [] });
  readonly tecnologiasDisp = toSignal(this.maestra.getTecnologias(), { initialValue: [] });
  readonly personalDisp = toSignal(this.maestra.getPersonal(), { initialValue: [] });
  readonly tiposReq = toSignal(this.maestra.getConceptos('TIP_REQ'), { initialValue: [] });
  readonly prioridades = toSignal(this.maestra.getConceptos('NIV_PRIO'), { initialValue: [] });
  readonly criticidades = toSignal(this.maestra.getConceptos('NIV_CRI'), { initialValue: [] });
  readonly gruposTec = toSignal(this.maestra.getConceptos('GRP_TEC'), { initialValue: [] });

  readonly nombreFabricaVisual = signal<string>('—');

  // ── Señales: maestras dinámicas (cascade) ─────────────────────────────
  readonly equipos = toSignal(
    this.form.controls.idGerencia.valueChanges.pipe(
      switchMap(id => {
        this.form.controls.idEquipo.reset(null, { emitEvent: false });
        return id != null
          ? this.maestra.getEquipos(id)
          : of([] as EquipoDTO[]);
      })
    ),
    { initialValue: [] as EquipoDTO[] }
  );

  readonly modulos = toSignal(
    this.form.controls.idSistema.valueChanges.pipe(
      switchMap(id => {
        this.form.controls.idModulo.reset(null, { emitEvent: false });
        return id != null
          ? this.maestra.getModulos(id)
          : of([] as ModuloDTO[]);
      })
    ),
    { initialValue: [] as ModuloDTO[] }
  );

  // ── Effect: auto-parchear idFabrica desde contrato seleccionado ───────
  private readonly _patchFabrica = effect(() => {
    const idContrato = this.idContratoValue();
    const lista = this.contratos();
    const found = lista.find(c => c.id === idContrato);

    this.form.controls.idFabrica.setValue(
      found?.idFabrica ?? null,
      { emitEvent: false }
    );

    this.nombreFabricaVisual.set(found?.nombreFabrica ?? '—');
  });

  // ── Effect: Auto-seleccionar contrato si solo hay uno ─────────────────
  private readonly _autoSelectContrato = effect(() => {
    const lista = this.contratos();
    if (lista.length === 1) {
      const unicoContrato = lista[0];
      if (this.form.controls.idContrato.value !== unicoContrato.id) {
        this.form.controls.idContrato.setValue(unicoContrato.id);
      }
    }
  });

  constructor() {
    // ── Auto-rellenar la primera fila de costos al elegir Equipo Principal ──
    this.form.controls.idEquipo.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(idEq => {
        const idGer = this.form.controls.idGerencia.value;
        if (idGer && idEq && this.costosArr.length === 0 && this.modo === 'NUEVO') {
          this.cargarEquiposFila(idGer);
          const equipoData = this.equipos().find(e => e.id === idEq);
          this.costosArr.push(this.buildCostoRow(
            idGer,
            idEq,
            100,
            equipoData?.codigoCentroCosto
          ));
        }
      });
  }

  ngOnInit(): void {
    this.cargarMaestrasExtra();

    // 👇 Detección de Modo por URL
    //const path = this.route.snapshot.url[0]?.path;
    const urlCompleta = this.router.url;
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      this.reqId = Number(idParam);
      //this.modo = path === 'ver' ? 'VER' : 'EDITAR';
      this.modo = urlCompleta.includes('/ver/') ? 'VER' : 'EDITAR';
      this.cargarRequerimiento(this.reqId);
    }
  }

  // ── Método de Hidratación (Carga para Ver/Editar) ─────────────────────
  private cargarRequerimiento(id: number): void {
    this.service.obtenerPorId(id).subscribe({
      next: (data) => {

        // Helper interno para parsear fechas del Backend
        const parseDate = (dateStr: string | null): Date | null => {
          if (!dateStr) return null;
          const soloFecha = dateStr.split('T')[0];
          const [y, m, d] = soloFecha.split('-');
          return new Date(+y, +m - 1, +d);
        };

        // 1. Cabecera general
        this.form.patchValue({
          idContrato: data.idContrato,
          idFabrica: data.idFabrica,
          idGerencia: data.idGerencia,
          idEquipo: data.idEquipo,
          idSistema: data.idSistema,
          idModulo: data.idModulo,
          tipoRequerimiento: data.codTipoReq,
          codCriticidad: data.codCriticidad,
          prioridad: data.codPrioridad,
          estado: data.codEstado,
          codGrupoTecnologico: data.codGrupoTecnologico,
          codExterno: data.codExterno,
          nombre: data.nombre,
          descripcion: data.descripcion,
          fechaSolicitud: parseDate(data.fechaSolicitud),
          fechaInicio: parseDate(data.fechaInicioReal),
          // 2. Tecnologías (mapeamos del objeto a solo un array de IDs para el MultiSelect)
          tecnologias: (data.tecnologias || []).map((t: any) => t.idTecnologia)
        });

        // 3. Distribución de Costos
        this.costosArr.clear();
        if (data.distribucionCostos) {
          data.distribucionCostos.forEach((c: any) => {
            this.cargarEquiposFila(data.idGerencia); // Asegurar caché para mostrar nombres
            this.costosArr.push(this.buildCostoRow(data.idGerencia, c.idEquipo, c.porcentaje, c.codigoCentroCosto));
          });
        }

        // 4. Personal Asignado
        this.personalArr.clear();
        if (data.personal) {
          data.personal.forEach((p: any) => {
            const row = this.buildPersonalRow(
              p.idPersonal,
              p.esResponsablePrincipal,
              parseDate(p.fechaInicioAsignacion),
              parseDate(p.fechaFinAsignacion)
            );

            // Reconstruimos objeto parcial para el AutoComplete por si la maestra aún carga
            const personalInfo = this.listaPersonal().find(x => x.id === p.idPersonal)
              || { id: p.idPersonal, nombresApellidos: p.nombresApellidos, correo: '', rolProyectoDescripcion: '' };

            row.get('personalObj')?.setValue(personalInfo);
            this.personalArr.push(row);
          });
        }

        // 5. Bloquear si es Solo Lectura
        if (this.modo === 'VER') {
          setTimeout(() => {
            this.form.disable({ emitEvent: false });
          });
        }
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el requerimiento' })
    });
  }

  // ── Getters de FormArrays ─────────────────────────────────────────────
  get costosArr(): FormArray<FormGroup> { return this.form.get('distribucionCostos') as FormArray<FormGroup>; }
  get personalArr(): FormArray<FormGroup> { return this.form.get('personal') as FormArray<FormGroup>; }

  get sumaPorcentajes(): number {
    return this.costosArr.controls.reduce(
      (acc, g) => acc + (Number(g.get('porcentaje')?.value) || 0), 0
    );
  }

  fc(name: string): AbstractControl | null { return this.form.get(name); }

  // ── Builders de filas ─────────────────────────────────────────────────
  private buildCostoRow(
    idGerencia: number | null = null,
    idEquipo: number | null = null,
    porcentaje: number | null = null,
    codigoCentroCosto: string | undefined = ''
  ): FormGroup {
    return this.fb.group({
      idGerencia: this.fb.control<number | null>(idGerencia, Validators.required),
      idEquipo: this.fb.control<number | null>(idEquipo, Validators.required),
      codigoCentroCosto: this.fb.nonNullable.control(codigoCentroCosto || '', Validators.required),
      porcentaje: this.fb.control<number | null>(porcentaje, [Validators.required, Validators.min(0.01), Validators.max(100)]),
    });
  }

  private buildPersonalRow(
    idPersonal: number | null = null,
    esResp: boolean = false,
    fInicio: Date | null = null,
    fFin: Date | null = null
  ): FormGroup {
    return this.fb.group({
      personalObj: this.fb.control<PersonalDTO | null>(null, Validators.required),
      esResponsablePrincipal: this.fb.nonNullable.control(esResp),
      fechaInicioAsignacion: this.fb.control<Date | null>(fInicio, Validators.required),
      fechaFinAsignacion: this.fb.control<Date | null>(fFin)
    });
  }

  // ── Acciones sobre filas ─────────────────────────────────────────────
  agregarCosto(): void { this.costosArr.push(this.buildCostoRow()); }
  eliminarCosto(i: number): void { this.costosArr.removeAt(i); }

  agregarFilaPersonal(): void { this.personalArr.push(this.buildPersonalRow()); }
  eliminarFilaPersonal(i: number): void { this.personalArr.removeAt(i); }

  // ── Lógica del Autocomplete ──────────────────────────────────────────
  filtrarPersonal(event: any): void {
    const query = event.query.toLowerCase();
    const filtrados = this.listaPersonal().filter(p =>
      p.nombresApellidos.toLowerCase().includes(query) ||
      p.correo.toLowerCase().includes(query)
    );
    this.personalFiltrado.set(filtrados);
  }

  // ── Guardar (POST o PUT) ──────────────────────────────────────────────
  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.msg.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Completa todos los campos requeridos antes de guardar.',
        life: 4000,
      });
      return;
    }

    const raw = this.form.getRawValue();
    const toDateStr = (d: Date | null): string | undefined =>
      d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : undefined;

    const payload = {
      idContrato: raw.idContrato!,
      idFabrica: raw.idFabrica!,
      idGerencia: raw.idGerencia!,
      idEquipo: raw.idEquipo!,
      idSistema: raw.idSistema!,
      idModulo: raw.idModulo!,
      codTipoReq: raw.tipoRequerimiento,
      codCriticidad: raw.codCriticidad,
      codPrioridad: raw.prioridad,
      codEstado: raw.estado,
      codGrupoTecnologico: raw.codGrupoTecnologico,
      codExterno: raw.codExterno,
      nombre: raw.nombre,
      descripcion: raw.descripcion,
      fechaSolicitud: toDateStr(raw.fechaSolicitud) ?? '',
      fechaInicioReal: toDateStr(raw.fechaInicio), // Mapeado para el PUT

      distribucionCostos: raw.distribucionCostos.map((c: any) => ({
        idEquipo: c.idEquipo,
        codigoCentroCosto: c.codigoCentroCosto,
        porcentaje: c.porcentaje
      })),

      tecnologias: (raw.tecnologias || []).map((id: number) => ({ idTecnologia: id })),

      personal: raw.personal.map((p: any) => ({
        idPersonal: p.personalObj?.id as number,
        esResponsablePrincipal: !!p.esResponsablePrincipal,
        fechaInicioAsignacion: toDateStr(p.fechaInicioAsignacion) ?? '',
        fechaFinAsignacion: toDateStr(p.fechaFinAsignacion)
      }))
    };

    if (this.modo === 'EDITAR' && this.reqId) {
      // 🚀 PUT (Actualizar)
      this.service.actualizar(this.reqId, payload).subscribe({
        next: () => {
          this.msg.add({ severity: 'success', summary: 'Actualizado', detail: 'El requerimiento fue actualizado correctamente.', life: 3000 });
          setTimeout(() => this.router.navigate(['/requerimientos']), 1500);
        },
        error: (err) => {
          this.msg.add({ severity: 'error', summary: 'Error al actualizar', detail: err.error?.message || 'Error del servidor.', life: 5000 });
        }
      });
    } else {
      // 🚀 POST (Crear)
      this.service.registrar(payload).subscribe({
        next: (res: any) => {
          this.msg.add({ severity: 'success', summary: 'Registro exitoso', detail: 'El requerimiento fue registrado correctamente.', life: 3000 });

          const nuevoId = res?.data?.idRequerimiento || res?.idRequerimiento;
          console.log('🐞 [FORM] Backend respondió con ID:', nuevoId);

          setTimeout(() => {
            console.log('🐞 [FORM] Navegando con state:', { nuevoIdDestacado: nuevoId });
            // Navegamos mandando el ID en el estado oculto del Router
            this.router.navigate(['/requerimientos'], { state: { nuevoIdDestacado: nuevoId } });
          }, 1500);
        },
        error: (err) => {
          this.msg.add({ severity: 'error', summary: 'Error al registrar', detail: err.error?.message || 'Error del servidor.', life: 5000 });
        }
      });
    }
  }

  // ── Utilitarios de Grillas ─────────────────────────────────────────────
  cargarEquiposFila(idGerencia: number | null): void {
    if (!idGerencia || this.equiposPorGerencia()[idGerencia]) return;
    this.maestra.getEquipos(idGerencia).subscribe(eqs => {
      this.equiposPorGerencia.update(prev => ({ ...prev, [idGerencia]: eqs }));
    });
  }

  alCambiarGerenciaFila(index: number, idGerencia: number): void {
    const row = this.costosArr.at(index);
    row.get('idEquipo')?.setValue(null);
    this.cargarEquiposFila(idGerencia);
  }

  alCambiarEquipoFila(index: number, idEquipo: number): void {
    const row = this.costosArr.at(index);
    const idGerencia = row.get('idGerencia')?.value;

    if (!idGerencia || !idEquipo) {
      row.get('codigoCentroCosto')?.setValue('');
      return;
    }

    this.maestra.getEquipos(idGerencia).subscribe(listaEquipos => {
      const equipoEncontrado = listaEquipos.find(e => e.id === idEquipo);
      row.get('codigoCentroCosto')?.setValue(equipoEncontrado?.codigoCentroCosto || '');
    });
  }

  private cargarMaestrasExtra(): void {
    this.maestra.getTecnologias().subscribe(res => this.listaTecnologias.set(res));
    this.maestra.getPersonal().subscribe(res => this.listaPersonal.set(res));
  }

  cancelar(): void {
    this.router.navigate(['/requerimientos']);
  }
}
