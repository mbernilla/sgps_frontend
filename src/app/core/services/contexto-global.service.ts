import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ContextoGlobalService {
  // Inicializamos en null. Cuando el usuario seleccione un contrato en el Top Bar, actualizaremos esta signal.
  // readonly idContratoActivo = signal<number | null>(null); //MBS
  readonly idContratoActivo = signal<number | null>(2);

  setContratoActivo(id: number): void {
    this.idContratoActivo.set(id);
  }
}
