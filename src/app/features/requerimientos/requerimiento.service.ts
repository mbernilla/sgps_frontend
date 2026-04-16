import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RequerimientoRegistroRequestDTO } from './requerimiento.model';

@Injectable({ providedIn: 'root' })
export class RequerimientoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.baseUrl}/v1/requerimientos`;

  registrar(data: RequerimientoRegistroRequestDTO): Observable<unknown> {
    return this.http.post(this.apiUrl, data);
  }

    // 1. Obtener un requerimiento específico por ID
  obtenerPorId(id: number): Observable<any> {
    // ⚠️ Ojo: Usa this.API_URL o this.base (como lo tengas nombrado en tu proyecto)
    return this.http.get<any>(`${environment.baseUrl}/v1/requerimientos/${id}`)
      .pipe(map(res => res.data)); // Extraemos directamente el nodo "data"
  }

  // 2. Actualizar un requerimiento existente (PUT)
  actualizar(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${environment.baseUrl}/v1/requerimientos/${id}`, payload);
  }
}
