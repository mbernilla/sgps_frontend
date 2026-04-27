import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { CicloContratoDTO, ConciliacionDetalleDTO, ConciliacionManualRequest, ConceptoDTO, EntregableConciliacionDTO, PenalidadDTO, PenalidadRequest, RequerimientoComboDTO, SlaComboDTO } from '../models/conciliacion.models';

@Injectable({ providedIn: 'root' })
export class ConciliacionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.baseUrl}/v1`;

  getCiclosMaestro(): Observable<ApiResponse<CicloContratoDTO[]>> {
    return this.http.get<ApiResponse<CicloContratoDTO[]>>(`${this.base}/ciclos/maestro`);
  }

  getRequerimientosCombo(): Observable<ApiResponse<RequerimientoComboDTO[]>> {
    return this.http.get<ApiResponse<RequerimientoComboDTO[]>>(`${this.base}/requerimientos/combo`);
  }

  registrarManual(idCiclo: number, payload: ConciliacionManualRequest): Observable<ApiResponse<ConciliacionDetalleDTO>> {
    return this.http.post<ApiResponse<ConciliacionDetalleDTO>>(
      `${this.base}/ciclos/${idCiclo}/conciliaciones`, payload
    );
  }

  eliminarConciliacion(idCiclo: number, idConciliacion: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.base}/ciclos/${idCiclo}/conciliaciones/${idConciliacion}`
    );
  }

  revertirConciliacion(idCiclo: number, idConciliacion: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(
      `${this.base}/ciclos/${idCiclo}/conciliaciones/${idConciliacion}/revertir`, {}
    );
  }

  confirmarConciliacion(idCiclo: number, idConciliacion: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(
      `${this.base}/ciclos/${idCiclo}/conciliaciones/${idConciliacion}/conciliar`, {}
    );
  }

  actualizarConciliacionManual(idCiclo: number, idConciliacion: number, payload: ConciliacionManualRequest): Observable<ApiResponse<ConciliacionDetalleDTO>> {
    return this.http.put<ApiResponse<ConciliacionDetalleDTO>>(
      `${this.base}/ciclos/${idCiclo}/conciliaciones/${idConciliacion}`, payload
    );
  }

  importarExcel(idCiclo: number, payload: object[]): Observable<ApiResponse<ConciliacionDetalleDTO[]>> {
    return this.http.post<ApiResponse<ConciliacionDetalleDTO[]>>(
      `${this.base}/ciclos/${idCiclo}/conciliaciones/importar`, payload
    );
  }

  getDetalleConciliaciones(idCiclo: number): Observable<ApiResponse<ConciliacionDetalleDTO[]>> {
    return this.http.get<ApiResponse<ConciliacionDetalleDTO[]>>(
      `${this.base}/ciclos/${idCiclo}/conciliaciones`
    );
  }

  getEntregablesConciliacion(idCiclo: number, idConciliacion: number): Observable<ApiResponse<EntregableConciliacionDTO[]>> {
    return this.http.get<ApiResponse<EntregableConciliacionDTO[]>>(
      `${this.base}/ciclos/${idCiclo}/conciliaciones/${idConciliacion}/entregables`
    );
  }

  asignarEntregables(idCiclo: number, idConciliacion: number, ids: number[]): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${this.base}/ciclos/${idCiclo}/conciliaciones/${idConciliacion}/entregables`, ids
    );
  }

  getPenalidadesPorCiclo(idCiclo: number): Observable<ApiResponse<PenalidadDTO[]>> {
    return this.http.get<ApiResponse<PenalidadDTO[]>>(
      `${this.base}/ciclos/${idCiclo}/penalidades`
    );
  }

  getSlasCombo(idContrato: number): Observable<ApiResponse<SlaComboDTO[]>> {
    return this.http.get<ApiResponse<SlaComboDTO[]>>(
      `${this.base}/contratos/${idContrato}/slas/combo`
    );
  }

  getConceptos(cod: string): Observable<ApiResponse<ConceptoDTO[]>> {
    return this.http.get<ApiResponse<ConceptoDTO[]>>(
      `${this.base}/maestras/conceptos/${cod}`
    );
  }

  guardarPenalidad(idCiclo: number, data: PenalidadRequest): Observable<ApiResponse<PenalidadDTO>> {
    return this.http.post<ApiResponse<PenalidadDTO>>(
      `${this.base}/ciclos/${idCiclo}/penalidades`, data
    );
  }

  eliminarPenalidad(idCiclo: number, idPenalidad: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.base}/ciclos/${idCiclo}/penalidades/${idPenalidad}`
    );
  }

  actualizarPenalidad(idCiclo: number, idPenalidad: number, data: PenalidadRequest): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${this.base}/ciclos/${idCiclo}/penalidades/${idPenalidad}`, data
    );
  }
}
