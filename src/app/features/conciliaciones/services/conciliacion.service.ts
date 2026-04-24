import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { CicloContratoDTO, ConciliacionDetalleDTO, ConciliacionManualRequest, RequerimientoComboDTO } from '../models/conciliacion.models';

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
}
