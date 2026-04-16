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
}

export interface ApiResponse<T> {
  mensaje: string;
  data: T;
}
