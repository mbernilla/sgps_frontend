// src/app/features/requerimientos/services/requerimientos.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, PaginaDTO, RequerimientoFiltroDTO, RequerimientoGridDTO } from '../models/requerimientos.models';

@Injectable({
  providedIn: 'root'
})
export class RequerimientosService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.baseUrl}/v1/requerimientos`;

  buscarPaginado(filtro: RequerimientoFiltroDTO): Observable<ApiResponse<PaginaDTO<RequerimientoGridDTO>>> {
    return this.http.post<ApiResponse<PaginaDTO<RequerimientoGridDTO>>>(`${this.API_URL}/buscar`, filtro);
  }



  eliminar(id: number): Observable<any> {
    // Apunta exactamente a la URL que me pasaste
    return this.http.delete(`${this.API_URL}/${id}`);
  }
}
