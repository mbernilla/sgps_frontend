// src/app/features/requerimientos/services/requerimientos.service.ts

import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, PaginaDTO, RequerimientoFiltroDTO, RequerimientoGridDTO, OrdenDTO } from '../models/requerimientos.models';
import { BaseHttpService } from '../../../core/services/base-http.service';

@Injectable({
  providedIn: 'root'
})

export class RequerimientosService extends BaseHttpService<RequerimientoGridDTO, number> {
  protected override get baseUrl(): string {
    return `${environment.baseUrl}/v1/requerimientos`;
  }

  private readonly filtroGuardado = signal<RequerimientoFiltroDTO | null>(null);

  buscarPaginado(filtro: RequerimientoFiltroDTO): Observable<ApiResponse<PaginaDTO<RequerimientoGridDTO>>> {
    return this.http.post<ApiResponse<PaginaDTO<RequerimientoGridDTO>>>(`${this.baseUrl}/buscar`, filtro);
  }

  guardarFiltro(filtro: RequerimientoFiltroDTO): void {
    this.filtroGuardado.set({ ...filtro });
  }

  obtenerFiltroGuardado(): RequerimientoFiltroDTO | null {
    return this.filtroGuardado();
  }

  limpiarFiltroGuardado(): void {
    this.filtroGuardado.set(null);
  }

}
