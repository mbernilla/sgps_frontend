import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiResponse } from '../../../../core/models/api-response.model';
import {
  PersonalDTO,
  PersonalRequestDTO,
  UsuarioComboDTO,
} from './contrato-personal.model';

@Injectable({ providedIn: 'root' })
export class ContratoPersonalService {
  private readonly http = inject(HttpClient);
  private readonly basePersonal = `${environment.baseUrl}/v1/maestras/personal`;
  private readonly baseUsuarios = `${environment.baseUrl}/v1/combos/usuarios-fabrica`;

  private getHeadersWithContrato(
    contratoId: number
  ): { headers: HttpHeaders } {
    return {
      headers: new HttpHeaders({
        'X-Contrato-Id': contratoId.toString(),
      }),
    };
  }

  // ── Personal ────────────────────────────────────────────────────────────

  getPersonal(contratoId: number): Observable<ApiResponse<PersonalDTO[]>> {
    return this.http.get<ApiResponse<PersonalDTO[]>>(
      this.basePersonal,
      this.getHeadersWithContrato(contratoId)
    );
  }

  createPersonal(
    contratoId: number,
    payload: PersonalRequestDTO
  ): Observable<ApiResponse<PersonalDTO>> {
    return this.http.post<ApiResponse<PersonalDTO>>(
      this.basePersonal,
      payload,
      this.getHeadersWithContrato(contratoId)
    );
  }

  updatePersonal(
    idPersonal: number,
    contratoId: number,
    payload: PersonalRequestDTO
  ): Observable<ApiResponse<PersonalDTO>> {
    return this.http.put<ApiResponse<PersonalDTO>>(
      `${this.basePersonal}/${idPersonal}`,
      payload,
      this.getHeadersWithContrato(contratoId)
    );
  }

  deletePersonal(
    idPersonal: number,
    contratoId: number
  ): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.basePersonal}/${idPersonal}`,
      this.getHeadersWithContrato(contratoId)
    );
  }

  // ── Usuarios (Combo) ────────────────────────────────────────────────────

  getUsuariosFabrica(
    contratoId: number
  ): Observable<ApiResponse<UsuarioComboDTO[]>> {
    return this.http.get<ApiResponse<UsuarioComboDTO[]>>(
      this.baseUsuarios,
      this.getHeadersWithContrato(contratoId)
    );
  }
}
