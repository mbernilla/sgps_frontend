import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  GerenciaDTO,
  EquipoDTO,
  GerenciaCreateDTO,
  GerenciaUpdateDTO,
  EquipoCreateDTO,
  EquipoUpdateDTO
} from './gerencias.models';

@Injectable({ providedIn: 'root' })
export class GerenciasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.baseUrl}/v1`;

  // ── Gerencias ──────────────────────────────────────────────────────────

  getGerencias(): Observable<ApiResponse<GerenciaDTO[]>> {
    return this.http.get<ApiResponse<GerenciaDTO[]>>(`${this.base}/gerencias`);
  }

  createGerencia(payload: GerenciaCreateDTO): Observable<ApiResponse<GerenciaDTO>> {
    return this.http.post<ApiResponse<GerenciaDTO>>(`${this.base}/gerencias`, payload);
  }

  updateGerencia(idGerencia: number, payload: GerenciaUpdateDTO): Observable<ApiResponse<GerenciaDTO>> {
    return this.http.put<ApiResponse<GerenciaDTO>>(`${this.base}/gerencias/${idGerencia}`, payload);
  }

  deleteGerencia(idGerencia: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/gerencias/${idGerencia}`);
  }

  // ── Equipos ────────────────────────────────────────────────────────────

  getEquipos(idGerencia: number): Observable<ApiResponse<EquipoDTO[]>> {
    return this.http.get<ApiResponse<EquipoDTO[]>>(`${this.base}/gerencias/${idGerencia}/equipos`);
  }

  createEquipo(idGerencia: number, payload: EquipoCreateDTO): Observable<ApiResponse<EquipoDTO>> {
    return this.http.post<ApiResponse<EquipoDTO>>(`${this.base}/gerencias/${idGerencia}/equipos`, payload);
  }

  updateEquipo(idEquipo: number, payload: EquipoUpdateDTO): Observable<ApiResponse<EquipoDTO>> {
    return this.http.put<ApiResponse<EquipoDTO>>(`${this.base}/equipos/${idEquipo}`, payload);
  }

  deleteEquipo(idEquipo: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/equipos/${idEquipo}`);
  }
}
