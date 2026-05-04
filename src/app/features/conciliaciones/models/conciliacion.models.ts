export interface RequerimientoComboDTO {
  id: number | null;
  codigoInternoFormateado: string;
  descripcionCompleta: string;
  esActivo?: boolean;
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

export interface EntregableConciliacionDTO {
  id: number;
  nombreEntregable: string;
  horasFacturables: number;
  seleccionado: boolean;
}

export interface PenalidadDTO {
  id: number;
  idContratoCiclo: number;
  idContratoSla: number;
  codigoSla: string;
  nombreSla: string;
  idRequerimiento: number;
  nombreRequerimiento: string;
  codGrupoTecnologico: number;
  descripcionGrupoTecnologico: string;
  horasPenalidad: number;
  precioUnitario: number;
  montoPenalidad: number;
  observacion: string;
}

export interface PenalidadRequest {
  idContratoSla: number;
  idRequerimiento: number | null;
  codGrupoTecnologico: string;
  horasPenalidad: number;
  observacion: string;
}

export interface SlaComboDTO {
  id: number;
  descripcion: string;
}

export interface ConceptoDTO {
  id: number;
  cod: string;
  nombre: string;
}
