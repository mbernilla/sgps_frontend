import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root' // <-- Esto lo hace global (Singleton)
})
export class AppContextService {

  // Inicializamos el signal con 2 (o null, dependiendo de tu lógica de inicio)
  readonly idContratoSeleccionado = signal<number>(2);

  // Método opcional para actualizarlo desde otras pantallas (ej. Login o Selector de Contratos)
  setContratoActivo(id: number): void {
    this.idContratoSeleccionado.set(id);
  }
}
