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

  obtenerPorId(id: number): Observable<any> {
    return this.http.get<any>(`${environment.baseUrl}/v1/requerimientos/${id}`)
      .pipe(map(res => res.data));
  }

  actualizar(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${environment.baseUrl}/v1/requerimientos/${id}`, payload);
  }

  iniciar(id: number, fecha: string): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${id}/iniciar`, { fecha });
  }

  finalizar(id: number, fecha: string): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${id}/finalizar`, { fecha });
  }

  desestimar(id: number, motivo: string): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${id}/desestimar`, { motivo });
  }

  anular(id: number, motivo: string): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${id}/anular`, { motivo });
  }
}
