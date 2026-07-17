export interface FabricaOption {
  id: number;
  razonSocial: string;
}

export interface ContratoResponse {
  id: number;
  idFabrica: number;
  razonSocialFabrica: string;
  codigoContrato: string;
  descripcion: string;
  fechaContrato: string;
  fechaInicio: string;
  fechaTermino: string;
  numeroMeses: number;
  esActivo: boolean;
  fechaCreacion: string;
  creadoPor: string;
}

export interface ContratoRequest {
  idFabrica: number;
  codigoContrato: string;
  descripcion: string;
  fechaContrato: string;
  fechaInicio: string;
  fechaTermino: string;
  numeroMeses: number;
}

export interface ContratoGtResponse {
  id: number;
  idContrato: number;
  codGrupoTecnologico: string;
  descripcionGrupo: string;
  horasContratadas: number;
  horasLineaBase: number;
  precioUnitario: number;
  horasSaldoTotal: number;
  saldoHorasAcumuladas: number;
  esActivo: boolean;
}

export interface ContratoGtRequest {
  codGrupoTecnologico: string;
  horasContratadas: number;
  horasLineaBase: number;
  precioUnitario: number;
}

export interface GrupoTecOption {
  id: string;
  nombre: string;
}

export interface ContratoModificadorResponse {
  id: number;
  idContrato: number;
  codTipoModificador: string;
  descripcionModificador: string;
  porcentaje: number;
  descripcion: string;
  esActivo: boolean;
}

export interface ContratoModificadorRequest {
  codTipoModificador: string;
  porcentaje: number;
  descripcion: string;
}

export interface ConceptoDTO {
  id: number;
  cod: string;
  nombre: string;
}


