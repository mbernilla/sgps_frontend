import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { RequerimientoCabeceraDTO } from '../../../core/models/requerimiento-cabecera.model';
import {
  CatalogoEntregableDTO,
  EditarEntregableRequest,
  EntregableGridDTO,
  EvaluacionRequest,
  FlujoBitacoraDTO,
  PresupuestoDesgloseDTO,
  RegistroEntregableRequest,
  RequerimientoFaseDTO,
  SaldoFaseDTO,
  UploadIntentRequest,
  UploadIntentResponse,
  ArchivoUploadResponseDTO
} from '../models/entregables.models';

@Injectable({ providedIn: 'root' })
export class EntregablesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.baseUrl}/v1`;

  getCabecera(idRequerimiento: number): Observable<ApiResponse<RequerimientoCabeceraDTO>> {
    return this.http.get<ApiResponse<RequerimientoCabeceraDTO>>(
      `${this.base}/requerimientos/${idRequerimiento}/cabecera`
    );
  }

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

  getDesglosePresupuesto(idFase: number): Observable<ApiResponse<PresupuestoDesgloseDTO[]>> {
    return this.http.get<ApiResponse<PresupuestoDesgloseDTO[]>>(
      `${this.base}/requerimientos/fases/${idFase}/desglose`
    );
  }

  getSaldoFase(idFase: number): Observable<ApiResponse<SaldoFaseDTO>> {
    return this.http.get<ApiResponse<SaldoFaseDTO>>(
      `${this.base}/entregables/fases/${idFase}/saldo`
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

  editar(idEntregable: number, payload: EditarEntregableRequest): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${this.base}/entregables/${idEntregable}`, payload
    );
  }

  eliminar(idEntregable: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.base}/entregables/${idEntregable}`
    );
  }

  anular(idEntregable: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(
      `${this.base}/entregables/${idEntregable}/anular`, {}
    );
  }

  // ========================================================================
  // ── NUEVA ARQUITECTURA DE ARCHIVOS ──────────────────────────────────────
  // ========================================================================

  /**
   * PASO 1 (Intención): Pide permiso al backend para subir una versión.
   */
  solicitarIntencion(idEntregable: number, payload: UploadIntentRequest): Observable<ApiResponse<UploadIntentResponse>> {
    return this.http.post<ApiResponse<UploadIntentResponse>>(
      `${this.base}/entregables/${idEntregable}/intencion`, payload
    );
  }

  /**
   * PASO 2 (Subida y Commit): Envía el binario junto con el token generado.
   */
  subirNuevaVersionSegura(idEntregable: number, uploadToken: string, subRutaDestino: string, file: File): Observable<ApiResponse<number>> {
    const formData = new FormData();
    formData.append('uploadToken', uploadToken);
    formData.append('subRutaDestino', subRutaDestino);
    formData.append('file', file);

    return this.http.post<ApiResponse<number>>(
      `${this.base}/entregables/${idEntregable}/subir-file`, formData
    );
  }

  /**
   * EVIDENCIAS: Subida directa al temporal (Usado por el modal de Observaciones)
   */
  uploadEvidencia(idRequerimiento: number, file: File): Observable<ApiResponse<ArchivoUploadResponseDTO>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<ArchivoUploadResponseDTO>>(
      `${this.base}/entregables/observaciones/evidencias`, // <-- Apuntando a la nueva ruta
      formData
    );
  }

  /**
   * DESCARGAS SEGURAS POR ID (Evita Path Traversal)
   */
  downloadArchivoSeguro(idArchivo: number, tipo: 'ENTREGABLE' | 'OBSERVACION'): Observable<HttpResponse<Blob>> {
    const url = tipo === 'ENTREGABLE'
      ? `${this.base}/entregables/archivos/${idArchivo}/descargar`
      : `${this.base}/entregables/observaciones/archivos/${idArchivo}/descargar`;

    return this.http.get(url, {
      responseType: 'blob',
      observe: 'response' // 👈 Le decimos a Angular que traiga los Headers
    });
  }

  /**
   * NUEVA VERSIÓN (CON PROGRESO REACTIVO)
   */
  subirNuevaVersionConProgreso(idEntregable: number, uploadToken: string, subRutaDestino: string, file: File): Observable<HttpEvent<ApiResponse<number>>> {
    const formData = new FormData();
    formData.append('uploadToken', uploadToken);
    formData.append('subRutaDestino', subRutaDestino);
    formData.append('file', file);

    return this.http.post<ApiResponse<number>>(
      `${this.base}/entregables/${idEntregable}/subir-file`, formData,
      { reportProgress: true, observe: 'events' } // 👈 ¡La magia del progreso!
    );
  }

  /**
   * EVIDENCIAS TEMP (CON PROGRESO REACTIVO)
   */
  uploadEvidenciaConProgreso(idRequerimiento: number, file: File): Observable<HttpEvent<ApiResponse<ArchivoUploadResponseDTO>>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<ArchivoUploadResponseDTO>>(
      `${this.base}/entregables/requerimientos/${idRequerimiento}/observaciones`, formData,
      { reportProgress: true, observe: 'events' }
    );
  }


}
