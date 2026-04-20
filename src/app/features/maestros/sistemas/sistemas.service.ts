import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  SistemaAdminDTO,
  ModuloAdminDTO,
  SistemaCreateDTO,
  ModuloCreateDTO,
} from './sistemas.models';

@Injectable({ providedIn: 'root' })
export class SistemasService {

  private readonly http = inject(HttpClient);
  private readonly base = `${environment.baseUrl}/v1/sistemas`;

  // ── Sistemas ───────────────────────────────────────────────────────────────

  getSistemas(): Observable<SistemaAdminDTO[]> {
    return this.http
      .get<ApiResponse<SistemaAdminDTO[]>>(this.base)
      .pipe(map(r => r.data));
  }

  createSistema(dto: SistemaCreateDTO): Observable<number> {
    return this.http
      .post<ApiResponse<number>>(this.base, dto)
      .pipe(map(r => r.data));
  }

  updateSistema(id: number, dto: SistemaCreateDTO): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${this.base}/${id}`, dto)
      .pipe(map(() => void 0));
  }

  deleteSistema(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.base}/${id}`)
      .pipe(map(() => void 0));
  }

  // ── Módulos ────────────────────────────────────────────────────────────────

  getModulos(idSistema: number): Observable<ModuloAdminDTO[]> {
    return this.http
      .get<ApiResponse<ModuloAdminDTO[]>>(`${this.base}/${idSistema}/modulos`)
      .pipe(map(r => r.data));
  }

  createModulo(idSistema: number, dto: ModuloCreateDTO): Observable<number> {
    return this.http
      .post<ApiResponse<number>>(`${this.base}/${idSistema}/modulos`, dto)
      .pipe(map(r => r.data));
  }

  updateModulo(idSistema: number, idModulo: number, dto: ModuloCreateDTO): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${this.base}/${idSistema}/modulos/${idModulo}`, dto)
      .pipe(map(() => void 0));
  }

  deleteModulo(idSistema: number, idModulo: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.base}/${idSistema}/modulos/${idModulo}`)
      .pipe(map(() => void 0));
  }
}
