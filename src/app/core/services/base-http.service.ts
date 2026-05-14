// src/app/core/services/base-http.service.ts
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export abstract class BaseHttpService<T, ID = number> {
  // 1. Inyectamos el HttpClient de forma nativa en la base
  protected readonly http = inject(HttpClient);

  // 2. Obligamos al hijo a definir cuál es su ruta
  protected abstract get baseUrl(): string;

  // ── Operaciones CRUD Estándar ──────────────────────────────────────────

  getAll(): Observable<T[]> {
    return this.http.get<T[]>(this.baseUrl);
  }

  getById(id: ID): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${id}`);
  }

  create(item: Partial<T>): Observable<T> {
    return this.http.post<T>(this.baseUrl, item);
  }

  update(id: ID, item: Partial<T>): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${id}`, item);
  }

  delete(id: ID): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
