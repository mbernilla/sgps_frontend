import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, SeguimientoDTO } from '../models/requerimientos.models';

@Injectable({
  providedIn: 'root'
})
export class SeguimientosService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.baseUrl;

  getHistorial(idRequerimiento: number): Observable<ApiResponse<SeguimientoDTO[]>> {
    return this.http.get<ApiResponse<SeguimientoDTO[]>>(`${this.apiBase}/v1/seguimientos/requerimiento/${idRequerimiento}`);
  }

  crear(payload: any): Observable<ApiResponse<SeguimientoDTO>> {
    return this.http.post<ApiResponse<SeguimientoDTO>>(`${this.apiBase}/v1/seguimientos`, payload);
  }

  actualizar(id: number, payload: any): Observable<ApiResponse<SeguimientoDTO>> {
    return this.http.put<ApiResponse<SeguimientoDTO>>(`${this.apiBase}/v1/seguimientos/${id}`, payload);
  }

  actualizarEstado(id: number, codEstado: string): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.apiBase}/v1/seguimientos/${id}/estado`, { codEstado });
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete(`${this.apiBase}/v1/seguimientos/${id}`);
  }

  uploadAdjuntoGlobal(entidadReferencia: string, idReferencia: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('entidadReferencia', entidadReferencia);
    formData.append('idReferencia', idReferencia.toString());
    formData.append('file', file);
    return this.http.post(`${this.apiBase}/v1/adjuntos/subir`, formData);
  }

  descargarArchivo(id: number): Observable<Blob> {
    // Aseguramos que el tipo de respuesta sea un blob (binario)
    // Angular se encarga de inyectar el Authorization header automáticamente
    // si ya tienes tu interceptor configurado.
    return this.http.get(`${this.apiBase}/v1/adjuntos/${id}/descargar`, {
      responseType: 'blob'
    });
  }

  eliminarAdjuntoGlobal(id: number): Observable<any> {
    return this.http.delete(`${this.apiBase}/v1/adjuntos/${id}`);
  }
}
