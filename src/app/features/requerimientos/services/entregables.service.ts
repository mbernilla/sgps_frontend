import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  CatalogoEntregableDTO,
  EntregableGridDTO,
  EvaluacionRequest,
  FlujoBitacoraDTO,
  NuevaVersionRequest,
  RegistroEntregableRequest,
  RequerimientoFaseDTO,
  UploadResponseDTO,
} from '../models/entregables.models';

@Injectable({ providedIn: 'root' })
export class EntregablesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.baseUrl}/v1`;

  getFasesByRequerimiento(idRequerimiento: number): Observable<ApiResponse<RequerimientoFaseDTO[]>> {
    return this.http.get<ApiResponse<RequerimientoFaseDTO[]>>(
      `${this.base}/requerimientos/${idRequerimiento}/fases`
    );
  }

  getCatalogoByFase(codFase: string): Observable<ApiResponse<CatalogoEntregableDTO[]>> {
    const params = new HttpParams().set('codFase', codFase);
    return this.http.get<ApiResponse<CatalogoEntregableDTO[]>>(
      `${this.base}/maestras/catalogos/entregables`, { params }
    );
  }

  getEntregablesByFase(idFase: number): Observable<ApiResponse<EntregableGridDTO[]>> {
    return this.http.get<ApiResponse<EntregableGridDTO[]>>(
      `${this.base}/fases/${idFase}/entregables`
    );
  }

  getFlujoByEntregable(idEntregable: number): Observable<ApiResponse<FlujoBitacoraDTO[]>> {
    return this.http.get<ApiResponse<FlujoBitacoraDTO[]>>(
      `${this.base}/entregables/${idEntregable}/flujo`
    );
  }

  registrar(payload: RegistroEntregableRequest): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(
      `${this.base}/entregables`, payload
    );
  }

  evaluar(idEntregable: number, payload: EvaluacionRequest): Observable<ApiResponse<null>> {
    return this.http.patch<ApiResponse<null>>(
      `${this.base}/entregables/${idEntregable}/evaluacion`, payload
    );
  }

  subirNuevaVersion(idEntregable: number, payload: NuevaVersionRequest): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(
      `${this.base}/entregables/${idEntregable}/versiones`, payload
    );
  }

  uploadArchivo(
    idRequerimiento: number,
    file: File,
    tipo: 'entregables' | 'feedback'
  ): Observable<ApiResponse<UploadResponseDTO>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', tipo);
    return this.http.post<ApiResponse<UploadResponseDTO>>(
      `${this.base}/archivos/upload/${idRequerimiento}`, formData
    );
  }

  downloadArchivo(ruta: string, nombre: string): Observable<Blob> {
    const params = new HttpParams().set('ruta', ruta).set('nombre', nombre);
    return this.http.get(
      `${this.base}/archivos/download`, { params, responseType: 'blob' }
    );
  }
}
