import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  PersonalInternoResponseDTO,
  PersonalInternoRequestDTO,
} from './personal-interno.model';

@Injectable({ providedIn: 'root' })
export class PersonalInternoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/v1/personal-interno`;

  listar(): Observable<ApiResponse<PersonalInternoResponseDTO[]>> {
    return this.http.get<ApiResponse<PersonalInternoResponseDTO[]>>(
      this.baseUrl
    );
  }

  obtenerPorId(id: number): Observable<ApiResponse<PersonalInternoResponseDTO>> {
    return this.http.get<ApiResponse<PersonalInternoResponseDTO>>(
      `${this.baseUrl}/${id}`
    );
  }

  crear(
    dto: PersonalInternoRequestDTO
  ): Observable<ApiResponse<PersonalInternoResponseDTO>> {
    return this.http.post<ApiResponse<PersonalInternoResponseDTO>>(
      this.baseUrl,
      dto
    );
  }

  actualizar(
    id: number,
    dto: PersonalInternoRequestDTO
  ): Observable<ApiResponse<PersonalInternoResponseDTO>> {
    return this.http.put<ApiResponse<PersonalInternoResponseDTO>>(
      `${this.baseUrl}/${id}`,
      dto
    );
  }

  eliminar(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}
