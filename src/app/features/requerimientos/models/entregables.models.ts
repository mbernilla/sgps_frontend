export interface RequerimientoFaseDTO {
  id: number;
  codFase: string;
  faseDescripcion: string;
}

export interface CatalogoEntregableDTO {
  id: number;
  nombre: string;
  abreviatura: string;
  codFase: string;
  extensionesPermitidas: string;
  tamanioMaximoMb: number;
}

export interface EntregableGridDTO {
  id: number;
  idCatalogoEntregable: number;
  nombreEntregable: string;
  codEstado: string;
  estadoDescripcion: string;
  horasFacturables: number;
  cantidadDevoluciones: number;
  fechaEntregaPlan: string;
  fechaAprobacionPlan: string;
  fechaAprobacionReal: string | null;
  nombreArchivo?: string;
  rutaArchivo?: string;
}

export interface ArchivoAdjuntoDTO {
  id?: number;
  nombreArchivo: string;
  rutaArchivo: string;
}

export interface FlujoBitacoraDTO {
  id: number;
  idArchivoVersion: number;
  nroVersion: number;
  codEstado: string;
  estadoDescripcion: string | null;
  comentarioResumen: string;
  fechaRegistro: string;
  registradoPor: number;
  archivos: ArchivoAdjuntoDTO[];
}

export interface UploadResponseDTO {
  nombreArchivoOriginal: string;
  nombreArchivoFisico: string;
  rutaFileServer: string;
  tamanioKb: number;
}

export interface RegistroEntregableRequest {
  idRequerimientoFase: number;
  idCatalogoEntregable: number;
  idEstimacion: number;
  horasFacturables: number;
  fechaEntregaPlan: string;
  fechaAprobacionPlan: string;
  archivo: {
    nombreArchivo: string;
    rutaFileServer: string;
    tamanioKb: number;
  };
}

export interface EvaluacionRequest {
  codEstado: string;
  comentarioResumen: string;
  archivosAdjuntos?: ArchivoAdjuntoDTO[];
}

export interface NuevaVersionRequest {
  nombreArchivo: string;
  rutaFileServer: string;
  tamanioKb: number;
}
