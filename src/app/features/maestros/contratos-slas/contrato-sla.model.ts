export interface ContratoSlaResponse {
  id: number;
  idContrato: number;
  codigoContrato: string;
  codigoSla: string;
  nombre: string;
  descripcionFormula: string;
  esActivo: boolean;
}

export interface ContratoSlaRequest {
  codigoSla: string;
  nombre: string;
  descripcionFormula: string;
}
