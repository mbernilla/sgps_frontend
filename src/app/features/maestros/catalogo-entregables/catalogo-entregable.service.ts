import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  CatalogoEntregableResponse,
  CatalogoEntregableRequest,
} from './catalogo-entregable.model';

@Injectable({ providedIn: 'root' })
export class CatalogoEntregableService {

  private readonly http = inject(HttpClient);
  private readonly base = `${environment.baseUrl}/v1/catalogo-entregables`;

  getEntregables(): Observable<CatalogoEntregableResponse[]> {
    return this.http
      .get<ApiResponse<CatalogoEntregableResponse[]>>(this.base)
      .pipe(map(r => r.data));
  }

  getEntregable(id: number): Observable<CatalogoEntregableResponse> {
    return this.http
      .get<ApiResponse<CatalogoEntregableResponse>>(`${this.base}/${id}`)
      .pipe(map(r => r.data));
  }

  createEntregable(dto: CatalogoEntregableRequest): Observable<number> {
    return this.http
      .post<ApiResponse<number>>(this.base, dto)
      .pipe(map(r => r.data));
  }

  updateEntregable(id: number, dto: CatalogoEntregableRequest): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${this.base}/${id}`, dto)
      .pipe(map(() => void 0));
  }

  deleteEntregable(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.base}/${id}`)
      .pipe(map(() => void 0));
  }

  clonarCatalogo(idContratoOrigen: number): Observable<void> {
    const urlClonar = `${environment.baseUrl}/v1/contratos/catalogo/clonar`;
    return this.http
      .post<ApiResponse<void>>(urlClonar, {}, { params: { idContratoOrigen } })
      .pipe(map(() => void 0));
  }
}
