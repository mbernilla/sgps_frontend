import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { EmpresaResponseDTO, EmpresaRequestDTO } from './empresas.models';

@Injectable({ providedIn: 'root' })
export class EmpresasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.baseUrl}/v1/maestras/empresas`;

  getEmpresas(): Observable<ApiResponse<EmpresaResponseDTO[]>> {
    return this.http.get<ApiResponse<EmpresaResponseDTO[]>>(this.base);
  }

  createEmpresa(payload: EmpresaRequestDTO): Observable<ApiResponse<EmpresaResponseDTO>> {
    return this.http.post<ApiResponse<EmpresaResponseDTO>>(this.base, payload);
  }

  updateEmpresa(idEmpresa: number, payload: EmpresaRequestDTO): Observable<ApiResponse<EmpresaResponseDTO>> {
    return this.http.put<ApiResponse<EmpresaResponseDTO>>(`${this.base}/${idEmpresa}`, payload);
  }

  deleteEmpresa(idEmpresa: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${idEmpresa}`);
  }
}
