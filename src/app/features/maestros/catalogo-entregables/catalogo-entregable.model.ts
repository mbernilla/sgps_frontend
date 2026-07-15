export interface CatalogoEntregableResponse {
  id: number;
  idContrato: number;
  codigoContrato: string;
  nombre: string;
  abreviatura: string;
  codFase: string;
  nombreFase: string;
  esEntregableFisico: boolean;
  extensionesPermitidas: string;
  tamanioMaximoMb: number;
  esActivo: boolean;
}

export interface CatalogoEntregableRequest {
  nombre: string;
  abreviatura: string;
  codFase: string;
  esEntregableFisico: boolean;
  extensionesPermitidas: string;
  tamanioMaximoMb: number;
}
