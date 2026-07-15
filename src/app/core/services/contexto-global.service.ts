import { Injectable, signal } from '@angular/core';

export interface ContratoSeleccion {
  id: number;
  codigoContrato: string;
  fabricaNombre: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContextoGlobalService {

  // Inicializamos leyendo el LocalStorage (si existe)
  readonly idContratoActivo = signal<number | null>(this.getSavedId());
  readonly contratoActual = signal<ContratoSeleccion | null>(this.getSavedContrato());

  setContratoActivo(contrato: ContratoSeleccion): void {
    this.idContratoActivo.set(contrato.id);
    this.contratoActual.set(contrato);

    // Guardamos en la memoria del navegador para sobrevivir al F5 / reload()
    localStorage.setItem('sgps_contrato_id', contrato.id.toString());
    localStorage.setItem('sgps_contrato_obj', JSON.stringify(contrato));
  }

  // Funciones auxiliares para leer la memoria
  private getSavedId(): number | null {
    const saved = localStorage.getItem('sgps_contrato_id');
    return saved ? Number(saved) : null;
  }

  private getSavedContrato(): ContratoSeleccion | null {
    const saved = localStorage.getItem('sgps_contrato_obj');
    return saved ? JSON.parse(saved) : null;
  }

  // Opcional: Método para limpiar cuando el usuario cierra sesión
  limpiarContexto(): void {
      localStorage.removeItem('sgps_contrato_id');
      localStorage.removeItem('sgps_contrato_obj');
      this.idContratoActivo.set(null);
      this.contratoActual.set(null);
  }
}
