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
