import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  EstimacionDTO,
  EstimacionRequestDTO,
  FaseMaestraDTO,
  ModificadorTarifaDTO,
} from '../models/estimaciones.models';

export const CONTRATO_ACTIVO_ID = 2;

@Injectable({ providedIn: 'root' })
export class EstimacionesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.baseUrl}/v1`;

  getByRequerimiento(idRequerimiento: number): Observable<ApiResponse<EstimacionDTO[]>> {

    const url = `${environment.baseUrl}/v1/estimaciones/requerimiento/${idRequerimiento}`;

    //console.log('🐞 getByRequerimiento:', url);

    return this.http.get<ApiResponse<EstimacionDTO[]>>(url);
  }

  crear(payload: EstimacionRequestDTO): Observable<ApiResponse<EstimacionDTO>> {
    return this.http.post<ApiResponse<EstimacionDTO>>(
      `${environment.baseUrl}/v1/estimaciones`, payload);
  }

  actualizar(id: number, payload: EstimacionRequestDTO): Observable<ApiResponse<EstimacionDTO>> {
    return this.http.put<ApiResponse<EstimacionDTO>>(
      `${environment.baseUrl}/v1/estimaciones/${id}`, payload);
  }

  aprobar(id: number): Observable<ApiResponse<EstimacionDTO>> {
    return this.http.patch<ApiResponse<EstimacionDTO>>(
      `${environment.baseUrl}/v1/estimaciones/${id}/aprobacion`,
      {},
    );
  }

  rechazar(id: number, motivoRechazo: string): Observable<ApiResponse<EstimacionDTO>> {
    const params = new HttpParams().set('motivoRechazo', motivoRechazo);
    return this.http.patch<ApiResponse<EstimacionDTO>>(
      `${environment.baseUrl}/v1/estimaciones/${id}/rechazo`,
      {},
      { params },
    );
  }

  eliminar(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${environment.baseUrl}/v1/estimaciones/${id}`);
  }

  getModificadoresTarifa(idContrato: number): Observable<ApiResponse<ModificadorTarifaDTO[]>> {

    const url = `${environment.baseUrl}/v1/contratos/${idContrato}/modificadores-tarifa`;

    return this.http.get<ApiResponse<ModificadorTarifaDTO[]>>(url);
  }

  getFasesMaestras(): Observable<ApiResponse<FaseMaestraDTO[]>> {
    const url = `${environment.baseUrl}/v1/maestras/conceptos/FAS_PRY`;

    return this.http.get<ApiResponse<FaseMaestraDTO[]>>(
      url
    );
  }
}
