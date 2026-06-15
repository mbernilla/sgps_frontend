import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ContextoGlobalService } from '../services/contexto-global.service'; // Ajusta tu ruta

export const contratoInterceptor: HttpInterceptorFn = (req, next) => {
  const contexto = inject(ContextoGlobalService);
  const idContrato = contexto.idContratoActivo();

  // Si hay un contrato seleccionado, clonamos la petición y le inyectamos la cabecera
  if (idContrato !== null) {
    const peticionModificada = req.clone({
      headers: req.headers.set('X-Contrato-Id', idContrato.toString())
    });
    return next(peticionModificada);
  }

  // Si no hay contrato, la petición sigue su curso normal
  return next(req);
};
