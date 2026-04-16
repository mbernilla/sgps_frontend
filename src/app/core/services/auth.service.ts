import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

const TOKEN_KEY = 'sgps_token';

export interface JwtPayload {
  sub: string;
  exp: number;
  nombre_completo?: string;
  permisos?: string[];
  id_empresa?: number;
}

export interface LoginResponse {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base   = environment.baseUrl;

  private readonly _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly isLoggedIn = computed(() => {
    const token = this._token();
    if (!token) return false;
    const payload = this._decodePayload(token);
    if (!payload) return false;
    return payload.exp * 1000 > Date.now();
  });

  // ── Login ──────────────────────────────────────────────────────────────
  login(correo: string, clave: string) {
  return this.http
    // Cambiamos ApiResponse<string> por LoginResponse
    .post<LoginResponse>(`${this.base}/auth/login`, { correo, clave })
    .pipe(
      tap(res => {
        // Ahora sí leemos 'res.token' en lugar de 'res.data'
        localStorage.setItem(TOKEN_KEY, res.token);
        this._token.set(res.token);
        console.log('Token real guardado:', res.token.substring(0, 20) + '...');
      })
    );
}

  // ── Logout ─────────────────────────────────────────────────────────────
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this._token.set(null);
    this.router.navigate(['/login']);
  }

  // ── Token ──────────────────────────────────────────────────────────────
  getToken(): string | null {
    return this._token();
  }

  // ── Payload del JWT ────────────────────────────────────────────────────
  getPayload(): JwtPayload | null {
    return this._decodePayload(this._token());
  }

  private _decodePayload(token: string | null): JwtPayload | null {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64)) as JwtPayload;
      console.log('JWT payload decodificado:', payload);
      console.log('exp (ms):', payload.exp * 1000, '| ahora:', Date.now(), '| válido:', payload.exp * 1000 > Date.now());
      return payload;
    } catch (err) {
      console.error('Error decodificando JWT:', err);
      return null;
    }
  }
}
