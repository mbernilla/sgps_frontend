import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Toast } from 'primeng/toast';
import { ProgressSpinner } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';

import { ConciliacionService } from '../services/conciliacion.service';
import { CostosAbcDTO } from '../models/conciliacion.models';

interface GrupoCostosABC {
  idEquipo: number;
  equipoNombre: string;
  gerenciaNombre: string;
  codigoCentroCosto: string;
  horasDistribuidas: number;
  montoDistribuido: number;
  montoDistribuidoSinIgv: number;
}

interface TotalesGrupo {
  horasDistribuidas: number;
  montoDistribuido: number;
  montoDistribuidoSinIgv: number;
}

interface GrupoTecnologicoData {
  codGrupoTecnologico: string;
  items: GrupoCostosABC[];
  totales: TotalesGrupo;
  expandido: boolean;
}

interface FilaAgrupada {
  codExterno: string;
  requerimientoNombre: string;
  horasDistribuidas: number;
  montoDistribuido: number;
  montoDistribuidoSinIgv: number;
}

@Component({
  selector: 'app-costos-abc',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TableModule,
    Toast,
    ProgressSpinner,
    TooltipModule,
    DialogModule,
  ],
  providers: [MessageService],
  templateUrl: './costos-abc.component.html',
  styleUrl: './costos-abc.component.scss',
})
export class CostosAbcComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly service = inject(ConciliacionService);
  private readonly msg = inject(MessageService);

  idCiclo = 0;
  private datosOriginales: CostosAbcDTO[] = [];

  readonly gruposTecnologicos = signal<GrupoTecnologicoData[]>([]);
  readonly totalGeneral = signal<TotalesGrupo>({
    horasDistribuidas: 0,
    montoDistribuido: 0,
    montoDistribuidoSinIgv: 0,
  });
  readonly cargando = signal(false);

  readonly modalVisible = signal(false);
  readonly equipoSeleccionado = signal<{ id: number; nombre: string; gerencia: string } | null>(null);
  readonly detallesEquipo = signal<CostosAbcDTO[]>([]);
  readonly filasAgrupadas = signal<FilaAgrupada[]>([]);
  readonly totalesModal = signal<TotalesGrupo>({
    horasDistribuidas: 0,
    montoDistribuido: 0,
    montoDistribuidoSinIgv: 0,
  });

  ngOnInit(): void {
    this.idCiclo = Number(this.route.snapshot.paramMap.get('idCiclo'));
    if (this.idCiclo) {
      this.cargarCostosABC();
    }
  }

  private cargarCostosABC(): void {
    this.cargando.set(true);
    this.service.getCostosABC(this.idCiclo).subscribe({
      next: res => {
        this.datosOriginales = res.data;
        const { grupos, total } = this.agruparDatosJerarquico(res.data);
        this.gruposTecnologicos.set(grupos);
        this.totalGeneral.set(total);
        this.cargando.set(false);
      },
      error: err => {
        this.cargando.set(false);
        this.msg.add({
          severity: 'error', summary: 'Error',
          detail: err.error?.mensaje || 'No se pudieron cargar los costos ABC.',
          life: 5000,
        });
      },
    });
  }

  private agruparDatosJerarquico(datos: CostosAbcDTO[]): { grupos: GrupoTecnologicoData[]; total: TotalesGrupo } {
    const mapGrupos = new Map<string, Map<string, GrupoCostosABC>>();
    let totalGeneral: TotalesGrupo = { horasDistribuidas: 0, montoDistribuido: 0, montoDistribuidoSinIgv: 0 };

    datos.forEach(item => {
      const codGrupo = item.codGrupoTecnologico;
      const claveFila = `${item.idEquipo}-${item.codigoCentroCosto}`;

      if (!mapGrupos.has(codGrupo)) {
        mapGrupos.set(codGrupo, new Map());
      }

      const mapFilas = mapGrupos.get(codGrupo)!;
      if (mapFilas.has(claveFila)) {
        const fila = mapFilas.get(claveFila)!;
        fila.horasDistribuidas += item.horasDistribuidas;
        fila.montoDistribuido += item.montoDistribuido;
        fila.montoDistribuidoSinIgv += item.montoDistribuidoSinIgv;
      } else {
        mapFilas.set(claveFila, {
          idEquipo: item.idEquipo,
          equipoNombre: item.equipoNombre,
          gerenciaNombre: item.gerenciaNombre,
          codigoCentroCosto: item.codigoCentroCosto,
          horasDistribuidas: item.horasDistribuidas,
          montoDistribuido: item.montoDistribuido,
          montoDistribuidoSinIgv: item.montoDistribuidoSinIgv,
        });
      }

      totalGeneral.horasDistribuidas += item.horasDistribuidas;
      totalGeneral.montoDistribuido += item.montoDistribuido;
      totalGeneral.montoDistribuidoSinIgv += item.montoDistribuidoSinIgv;
    });

    const grupos: GrupoTecnologicoData[] = Array.from(mapGrupos.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([codGrupo, mapFilas]) => {
        const items = Array.from(mapFilas.values());
        const totales: TotalesGrupo = {
          horasDistribuidas: items.reduce((sum, i) => sum + i.horasDistribuidas, 0),
          montoDistribuido: items.reduce((sum, i) => sum + i.montoDistribuido, 0),
          montoDistribuidoSinIgv: items.reduce((sum, i) => sum + i.montoDistribuidoSinIgv, 0),
        };
        return {
          codGrupoTecnologico: codGrupo,
          items,
          totales,
          expandido: true,
        };
      });

    return { grupos, total: totalGeneral };
  }

  toggleGrupo(grupo: GrupoTecnologicoData): void {
    grupo.expandido = !grupo.expandido;
  }

  abrirModalDetalles(item: GrupoCostosABC): void {
    this.equipoSeleccionado.set({
      id: item.idEquipo,
      nombre: item.equipoNombre,
      gerencia: item.gerenciaNombre,
    });
    const detalles = this.datosOriginales.filter(d => d.idEquipo === item.idEquipo);
    this.detallesEquipo.set(detalles);
    this.filasAgrupadas.set(this.agruparPorCodExterno(detalles));
    this.totalesModal.set(this.calcularTotalesModal(detalles));
    this.modalVisible.set(true);
  }

  private agruparPorCodExterno(datos: CostosAbcDTO[]): FilaAgrupada[] {
    const mapGrupos = new Map<string, CostosAbcDTO[]>();

    datos.forEach(item => {
      const cod = item.codExterno;
      if (!mapGrupos.has(cod)) {
        mapGrupos.set(cod, []);
      }
      mapGrupos.get(cod)!.push(item);
    });

    return Array.from(mapGrupos.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([codExterno, items]) => ({
        codExterno,
        requerimientoNombre: items[0].requerimientoNombre,
        horasDistribuidas: items.reduce((sum, i) => sum + i.horasDistribuidas, 0),
        montoDistribuido: items.reduce((sum, i) => sum + i.montoDistribuido, 0),
        montoDistribuidoSinIgv: items.reduce((sum, i) => sum + i.montoDistribuidoSinIgv, 0),
      }));
  }

  calcularTotalesModal(detalles: CostosAbcDTO[]): TotalesGrupo {
    return {
      horasDistribuidas: detalles.reduce((sum, item) => sum + item.horasDistribuidas, 0),
      montoDistribuido: detalles.reduce((sum, item) => sum + item.montoDistribuido, 0),
      montoDistribuidoSinIgv: detalles.reduce((sum, item) => sum + item.montoDistribuidoSinIgv, 0),
    };
  }

  volverALista(): void {
    this.location.back();
  }
}
