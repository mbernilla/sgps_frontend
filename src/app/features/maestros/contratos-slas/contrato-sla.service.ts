import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  ContratoSlaResponse,
  ContratoSlaRequest,
} from './contrato-sla.model';

@Injectable({ providedIn: 'root' })
export class ContratoSlaService {

  private readonly http = inject(HttpClient);
  private readonly base = `${environment.baseUrl}/v1/contratos-slas`;

  getSlas(): Observable<ContratoSlaResponse[]> {
    return this.http
      .get<ApiResponse<ContratoSlaResponse[]>>(this.base)
      .pipe(map(r => r.data));
  }

  getSla(id: number): Observable<ContratoSlaResponse> {
    return this.http
      .get<ApiResponse<ContratoSlaResponse>>(`${this.base}/${id}`)
      .pipe(map(r => r.data));
  }

  createSla(dto: ContratoSlaRequest): Observable<number> {
    return this.http
      .post<ApiResponse<number>>(this.base, dto)
      .pipe(map(r => r.data));
  }

  updateSla(id: number, dto: ContratoSlaRequest): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${this.base}/${id}`, dto)
      .pipe(map(() => void 0));
  }

  deleteSla(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.base}/${id}`)
      .pipe(map(() => void 0));
  }

  clonarSlas(idContratoOrigen: number): Observable<void> {
    const urlClonar = `${environment.baseUrl}/v1/contratos/copiar-slas-desde/${idContratoOrigen}`;
    return this.http
      .post<ApiResponse<void>>(urlClonar, {})
      .pipe(map(() => void 0));
  }
}
