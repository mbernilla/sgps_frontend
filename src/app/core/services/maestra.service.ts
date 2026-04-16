import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, shareReplay, map, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  GerenciaDTO,
  EquipoDTO,
  SistemaDTO,
  ModuloDTO,
  ContratoDTO,
  TecnologiaMaestraDTO,
  ConceptoDTO,
  TecnologiaDTO,
  PersonalDTO
} from '../models/maestra.model';

@Injectable({ providedIn: 'root' })
export class MaestraService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.baseUrl;

  // ── Observables cacheados (shareReplay) ────────────────────────────────
  private readonly _gerencias$ = this.http
    .get<ApiResponse<GerenciaDTO[]>>(`${this.base}/v1/maestras/gerencias`)
    .pipe(map(r => r.data), catchError(() => of([] as GerenciaDTO[])), shareReplay(1));

  private readonly _sistemas$ = this.http
    .get<ApiResponse<SistemaDTO[]>>(`${this.base}/v1/maestras/sistemas`)
    .pipe(map(r => r.data), catchError(() => of([] as SistemaDTO[])), shareReplay(1));

  private readonly _contratos$ = this.http
    .get<ApiResponse<ContratoDTO[]>>(`${this.base}/v1/contratos/lista`)
    .pipe(map(r => r.data), catchError(() => of([] as ContratoDTO[])), shareReplay(1));

  private readonly _tecnologias$ = this.http
    .get<ApiResponse<TecnologiaMaestraDTO[]>>(`${this.base}/v1/maestras/tecnologias`)
    .pipe(map(r => r.data), catchError(() => of([] as TecnologiaMaestraDTO[])), shareReplay(1));

  // ── Caché por parámetro (Map) ──────────────────────────────────────────
  private readonly _equiposCache = new Map<number, Observable<EquipoDTO[]>>();
  private readonly _modulosCache = new Map<number, Observable<ModuloDTO[]>>();
  private readonly _conceptosCache = new Map<string, Observable<ConceptoDTO[]>>();

  // ── API pública ────────────────────────────────────────────────────────
  getGerencias(): Observable<GerenciaDTO[]>           { return this._gerencias$; }
  getSistemas(): Observable<SistemaDTO[]>             { return this._sistemas$; }
  getContratos(): Observable<ContratoDTO[]>           { return this._contratos$; }

  getEquipos(idGerencia: number): Observable<EquipoDTO[]> {
    if (!this._equiposCache.has(idGerencia)) {
      const obs$ = this.http
        .get<ApiResponse<EquipoDTO[]>>(`${this.base}/v1/maestras/equipos?idGerencia=${idGerencia}`)
        .pipe(map(r => r.data), catchError(() => of([] as EquipoDTO[])), shareReplay(1));
      this._equiposCache.set(idGerencia, obs$);
    }
    return this._equiposCache.get(idGerencia)!;
  }

  getModulos(idSistema: number): Observable<ModuloDTO[]> {
    if (!this._modulosCache.has(idSistema)) {
      const obs$ = this.http
        .get<ApiResponse<ModuloDTO[]>>(`${this.base}/v1/maestras/modulos?idSistema=${idSistema}`)
        .pipe(map(r => r.data), catchError(() => of([] as ModuloDTO[])), shareReplay(1));
      this._modulosCache.set(idSistema, obs$);
    }
    return this._modulosCache.get(idSistema)!;
  }

  getConceptos(codGrupo: string): Observable<ConceptoDTO[]> {
    if (!this._conceptosCache.has(codGrupo)) {
      const obs$ = this.http
        .get<ApiResponse<ConceptoDTO[]>>(`${this.base}/v1/maestras/conceptos/${codGrupo}`)
        .pipe(map(r => r.data), catchError(() => of([] as ConceptoDTO[])), shareReplay(1));
      this._conceptosCache.set(codGrupo, obs$);
    }
    return this._conceptosCache.get(codGrupo)!;
  }

  getTecnologias(): Observable<TecnologiaDTO[]> {
    return this.http.get<ApiResponse<TecnologiaDTO[]>>(`${this.base}/v1/maestras/tecnologias`)
      .pipe(map(res => res.data), shareReplay(1));
  }

  getPersonal(): Observable<PersonalDTO[]> {
    return this.http.get<ApiResponse<PersonalDTO[]>>(`${this.base}/v1/maestras/personal`)
      .pipe(map(res => res.data), shareReplay(1)); // Caché básico si la lista no muta en la misma sesión
  }
}
