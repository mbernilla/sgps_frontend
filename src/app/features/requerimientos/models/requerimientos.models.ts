// src/app/features/requerimientos/models/requerimientos.models.ts

export interface PaginaDTO<T> {
  contenido: T[];
  totalElementos: number;
  totalPaginas: number;
  pagina: number;
  tamano: number;
}

export interface OrdenDTO {
  campo: string;
  direccion: 'ASC' | 'DESC';
}

export interface RequerimientoFiltroDTO {
  page: number;
  size: number;
  textoBusqueda?: string;
  codGrupoTecnologico?: string;
  orden?: OrdenDTO[];
}

export interface RequerimientoGridDTO {
  id: number;
  codExterno: string;
  nombre: string;
  codGrupoTecnologico: string;
  grupoTecnologicoDescripcion: string;
  codEstado: string;
  estadoDescripcion: string;
  codTipoReq: string;
  tipoReqDescripcion: string;
  sistemaNombre: string;
  moduloNombre: string;
  fechaSolicitud: string;
  porcentajeAvance: number;
  anio: number;
  secuencialAnio: number;
  siglasEquipo: string;
  codigoInternoFormateado: string;
  totalHorasAprobadas?: number;
  horasFacturadas?: number;
  esActivo?: boolean;
  cantidadPendientes: number;
}

export interface ApiResponse<T> {
  mensaje: string;
  data: T;
}

export interface ArchivoGlobalDTO {
  id: number;
  nombreOriginal: string;
  rutaFisica: string;
  tamanoKb: number;
}

export interface SeguimientoDTO {
  id: number;
  idRequerimiento: number;
  codTipoSeguimiento: string;
  codEstado: string;
  descripcion: string;
  fechaRegistro: string;
  fechaReal: string;
  fechaPlazo: string | null;
  fechaAtencion: string | null;
  idPersonalResponsable: number;

  archivos?: ArchivoGlobalDTO[];
}

export interface DistribucionCostoDTO {
  idEquipo: number | null;
  codigoCentroCosto: string;
  porcentaje: number | null;
}

export interface PersonalDTO {
  idPersonal: number | null;
  nombre: string;
  cargo: string;
  correo: string;
}

export interface TecnologiaDTO {
  idTecnologia: number | null;
  nombre: string;
  version: string;
  descripcion: string;
}

// requerimiento.model.ts

// requerimiento.model.ts

export interface RequerimientoRegistroRequestDTO {
  idContrato: number;
  idFabrica: number;
  idGerencia: number;
  idEquipo: number;
  idSistema: number;
  idModulo: number;

  codTipoReq: string;
  codCriticidad: string;
  codPrioridad: string;
  codEstado: string;
  codGrupoTecnologico: string;
  codExterno?: string;

  nombre: string;
  descripcion: string;
  fechaSolicitud: string;
  fechaInicio?: string;

  // 👇 TIPADO INLINE ESTRICTO PARA EL PAYLOAD DE ESCRITURA (POST)

  distribucionCostos: {
    idEquipo: number;
    codigoCentroCosto: string;
    porcentaje: number;
  }[];

  tecnologias: {
    idTecnologia: number;
  }[];

  personal: {
    idPersonal: number;
    esResponsablePrincipal: boolean;
    fechaInicioAsignacion: string;
    fechaFinAsignacion?: string;
  }[];
}
