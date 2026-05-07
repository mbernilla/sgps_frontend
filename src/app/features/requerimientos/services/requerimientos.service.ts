// src/app/features/requerimientos/services/requerimientos.service.ts

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, PaginaDTO, RequerimientoFiltroDTO, RequerimientoGridDTO, OrdenDTO } from '../models/requerimientos.models';

@Injectable({
  providedIn: 'root'
})
export class RequerimientosService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.baseUrl}/v1/requerimientos`;

  // ── Estado de paginación guardado ──────────────────────────────────────
  private readonly filtroGuardado = signal<RequerimientoFiltroDTO | null>(null);

  buscarPaginado(filtro: RequerimientoFiltroDTO): Observable<ApiResponse<PaginaDTO<RequerimientoGridDTO>>> {
    return this.http.post<ApiResponse<PaginaDTO<RequerimientoGridDTO>>>(`${this.API_URL}/buscar`, filtro);
  }

  // ── Métodos para guardar y restaurar filtro ────────────────────────────
  guardarFiltro(filtro: RequerimientoFiltroDTO): void {
    this.filtroGuardado.set({ ...filtro });
  }

  obtenerFiltroGuardado(): RequerimientoFiltroDTO | null {
    return this.filtroGuardado();
  }

  limpiarFiltroGuardado(): void {
    this.filtroGuardado.set(null);
  }

  eliminar(id: number): Observable<any> {
    // Apunta exactamente a la URL que me pasaste
    return this.http.delete(`${this.API_URL}/${id}`);
  }
}
