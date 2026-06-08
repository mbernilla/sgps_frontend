import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { BaseHttpService } from '../../../core/services/base-http.service';

// Asegúrate de consolidar tus imports de modelos según la estructura real de tu proyecto
import {
  ApiResponse,
  PaginaDTO,
  RequerimientoFiltroDTO,
  RequerimientoGridDTO
} from '../models/requerimientos.models';
import { RequerimientoRegistroRequestDTO } from '../models/requerimientos.models';

@Injectable({
  providedIn: 'root'
})
export class RequerimientosService extends BaseHttpService<RequerimientoGridDTO, number> {

  protected override get baseUrl(): string {
    return `${environment.baseUrl}/v1/requerimientos`;
  }

  // ==========================================
  // ESTADO LOCAL (Signals)
  // ==========================================
  private readonly filtroGuardado = signal<RequerimientoFiltroDTO | null>(null);

  guardarFiltro(filtro: RequerimientoFiltroDTO): void {
    this.filtroGuardado.set({ ...filtro });
  }

  obtenerFiltroGuardado(): RequerimientoFiltroDTO | null {
    return this.filtroGuardado();
  }

  limpiarFiltroGuardado(): void {
    this.filtroGuardado.set(null);
  }

  // ==========================================
  // BÚSQUEDA Y CONSULTAS
  // ==========================================
  buscarPaginado(filtro: RequerimientoFiltroDTO): Observable<ApiResponse<PaginaDTO<RequerimientoGridDTO>>> {
    return this.http.post<ApiResponse<PaginaDTO<RequerimientoGridDTO>>>(`${this.baseUrl}/buscar`, filtro);
  }

  // Conserva el map() crucial para que el componente no lidie con el Wrapper del backend
  obtenerPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`)
      .pipe(map(res => res.data));
  }

  // ==========================================
  // TRANSACCIONES Y CAMBIOS DE ESTADO
  // ==========================================
  registrar(data: RequerimientoRegistroRequestDTO): Observable<unknown> {
    return this.http.post(this.baseUrl, data);
  }

  actualizar(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, payload);
  }

  iniciar(id: number, fecha: string): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/${id}/iniciar`, { fecha });
  }

  finalizar(id: number, fecha: string): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/${id}/finalizar`, { fecha });
  }

  desestimar(id: number, motivo: string): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/${id}/desestimar`, { motivo });
  }

  anular(id: number, motivo: string): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/${id}/anular`, { motivo });
  }
}
