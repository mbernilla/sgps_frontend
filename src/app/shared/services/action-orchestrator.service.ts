import { Injectable, inject } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Observable, finalize } from 'rxjs';

export interface ConfirmActionConfig<T = any> {
  header: string;
  message: string;
  icon: string;
  acceptClass: string; // Ej: 'p-button-danger p-button-text'
  action: () => Observable<T>;

  acceptLabel?: string;
  rejectLabel?: string;

  onStart?: () => void;       // Ideal para encender Signals (ej: eliminandoId.set(id))
  onComplete?: () => void;    // Ideal para apagar Signals vía finalize()
  onSuccess?: (res: T) => void; // Para recargar tablas u otra lógica
}

@Injectable({ providedIn: 'root' })
export class ActionOrchestratorService {
  private readonly confirmService = inject(ConfirmationService);
  private readonly msg = inject(MessageService);

  ejecutar<T>(config: ConfirmActionConfig<T>): void {
  this.confirmService.confirm({
    header: config.header,
    message: config.message,
    icon: config.icon,
    acceptButtonStyleClass: config.acceptClass,
    rejectButtonStyleClass: 'p-button-text p-button-text',
    acceptIcon: 'none',
    rejectIcon: 'none',
    acceptLabel: config.acceptLabel || 'Sí, Confirmar',
    rejectLabel: config.rejectLabel || 'Cancelar',

    accept: () => {
      try {
        //console.log('[ActionOrchestrator] 1. Evaluando la acción...');
        if (config.onStart) config.onStart();

        // Si this.requerimientoService es undefined, explotará aquí y caerá al catch,
        // permitiendo que el modal siga su ciclo natural de cierre.
        const accionObservable = config.action();

        //console.log('[ActionOrchestrator] 2. Suscribiendo al backend...');
        accionObservable.pipe(
          finalize(() => {
            if (config.onComplete) config.onComplete();
          })
        ).subscribe({
          next: (res: any) => {
            //console.log('[ActionOrchestrator] 3. Éxito:', res);
            this.msg.add({
              severity: config.acceptClass.includes('danger') ? 'success' : 'success',
              summary: 'Operación exitosa',
              detail: res?.mensaje || 'La acción se realizó correctamente.',
              life: 3000
            });
            if (config.onSuccess) config.onSuccess(res);
          },
          error: (err) => {
            //console.error('[ActionOrchestrator] 4. Error HTTP:', err);
            this.msg.add({
              severity: 'error',
              summary: 'Error',
              detail: err.error?.mensaje || 'No se pudo completar la operación.',
              life: 5000
            });
          }
        });
      } catch (errorFatal) {
        // ¡Este catch es vital! Evita que el modal se quede pasmado
        //console.error('[ActionOrchestrator] 🔥 Error crítico antes de llamar al backend:', errorFatal);
        this.msg.add({
          severity: 'error',
          summary: 'Error interno',
          detail: 'No se pudo iniciar la operación. Revisa la consola.',
          life: 5000
        });
        if (config.onComplete) config.onComplete();
      }
    }
  });
}
}
