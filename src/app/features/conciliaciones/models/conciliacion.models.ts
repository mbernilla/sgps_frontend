export interface RequerimientoComboDTO {
  id: number;
  codigoInternoFormateado: string;
  descripcionCompleta: string;
}

export interface ConciliacionManualRequest {
  idRequerimiento: number;
  horasAprobadasExcel: number;
  horasTrabajadas: number;
}

export interface ConciliacionDetalleDTO {
  id: number;
  idContratoCiclo: number;
  idRequerimiento: number;
  codExterno: string;
  nombreRequerimiento: string;
  horasTrabajadas: number;
  horasAprobadasExcel: number;
  horasInternasAprobadas: number;
  diferenciaHoras: number;
  cuadreOk: boolean;
}

export interface CicloContratoDTO {
  id: number;
  nombreCiclo: string;
  fechaInicio: string;
  fechaFin: string;
  esCerrado: boolean;
  totalConciliados: number;
}
