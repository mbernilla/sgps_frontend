import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ContratoSelectorDTO } from '../../models/contrato-selector.model';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ContratoApiService {
  private http = inject(HttpClient);
  private url = `${environment.baseUrl}/v1/contratos`;

  listarContratosSelector(): Observable<ContratoSelectorDTO[]> {
    return this.http.get<any>(`${this.url}/selector`).pipe(
      map(response => response.data) // Desempaquetamos el array del ApiResponse
    );
  }
}
