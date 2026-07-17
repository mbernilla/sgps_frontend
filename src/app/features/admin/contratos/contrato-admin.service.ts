import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  ContratoResponse,
  ContratoRequest,
  FabricaOption,
  ContratoGtResponse,
  ContratoGtRequest,
  ContratoModificadorResponse,
  ContratoModificadorRequest,
} from './contrato-admin.model';

@Injectable({ providedIn: 'root' })
export class ContratoAdminService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/v1/admin/contratos`;
  private readonly baseFabricasUrl = `${environment.baseUrl}/v1/admin/contratos/fabricas/combo`;

  getFabricas(): Observable<FabricaOption[]> {
    return this.http
      .get<ApiResponse<FabricaOption[]>>(this.baseFabricasUrl)
      .pipe(map(r => r.data));
  }

  getContratos(): Observable<ContratoResponse[]> {
    return this.http
      .get<ApiResponse<ContratoResponse[]>>(this.baseUrl)
      .pipe(map(r => r.data));
  }

  getContrato(id: number): Observable<ContratoResponse> {
    return this.http
      .get<ApiResponse<ContratoResponse>>(`${this.baseUrl}/${id}`)
      .pipe(map(r => r.data));
  }

  createContrato(dto: ContratoRequest): Observable<number> {
    return this.http
      .post<ApiResponse<number>>(this.baseUrl, dto)
      .pipe(map(r => r.data));
  }

  updateContrato(id: number, dto: ContratoRequest): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${this.baseUrl}/${id}`, dto)
      .pipe(map(() => void 0));
  }

  deleteContrato(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${id}`)
      .pipe(map(() => void 0));
  }

  // ── Grupos Tecnológicos ────────────────────────────────────────────────────

  getGruposTecnologicos(idContrato: number): Observable<ContratoGtResponse[]> {
    return this.http
      .get<ApiResponse<ContratoGtResponse[]>>(`${this.baseUrl}/${idContrato}/gts`)
      .pipe(map(r => r.data));
  }

  getGrupoTecnologico(idContrato: number, id: number): Observable<ContratoGtResponse> {
    return this.http
      .get<ApiResponse<ContratoGtResponse>>(`${this.baseUrl}/${idContrato}/gts/${id}`)
      .pipe(map(r => r.data));
  }

  createGrupoTecnologico(idContrato: number, dto: ContratoGtRequest): Observable<number> {
    return this.http
      .post<ApiResponse<number>>(`${this.baseUrl}/${idContrato}/gts`, dto)
      .pipe(map(r => r.data));
  }

  updateGrupoTecnologico(idContrato: number, id: number, dto: ContratoGtRequest): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${this.baseUrl}/${idContrato}/gts/${id}`, dto)
      .pipe(map(() => void 0));
  }

  deleteGrupoTecnologico(idContrato: number, id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${idContrato}/gts/${id}`)
      .pipe(map(() => void 0));
  }

  // ── Modificadores ────────────────────────────────────────────────────────

  getModificadores(idContrato: number): Observable<ContratoModificadorResponse[]> {
    return this.http
      .get<ApiResponse<ContratoModificadorResponse[]>>(`${this.baseUrl}/${idContrato}/modificadores`)
      .pipe(map(r => r.data));
  }

  getModificador(idContrato: number, id: number): Observable<ContratoModificadorResponse> {
    return this.http
      .get<ApiResponse<ContratoModificadorResponse>>(`${this.baseUrl}/${idContrato}/modificadores/${id}`)
      .pipe(map(r => r.data));
  }

  createModificador(idContrato: number, dto: ContratoModificadorRequest): Observable<number> {
    return this.http
      .post<ApiResponse<number>>(`${this.baseUrl}/${idContrato}/modificadores`, dto)
      .pipe(map(r => r.data));
  }

  updateModificador(idContrato: number, id: number, dto: ContratoModificadorRequest): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${this.baseUrl}/${idContrato}/modificadores/${id}`, dto)
      .pipe(map(() => void 0));
  }

  deleteModificador(idContrato: number, id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${idContrato}/modificadores/${id}`)
      .pipe(map(() => void 0));
  }
}
