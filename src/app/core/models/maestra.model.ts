/** Estructura base que devuelve el backend como LookupResponseDTO */
export interface LookupDTO {
  id: number;
  nombre: string;
}

export type GerenciaDTO = LookupDTO;
//export type EquipoDTO         = LookupDTO;
export type SistemaDTO = LookupDTO;
export type ModuloDTO = LookupDTO;
export type TecnologiaMaestraDTO = LookupDTO;

/** Contrato extiende LookupDTO; idFabrica es opcional por si el endpoint
 *  devuelve datos adicionales en el futuro */
export interface ContratoDTO extends LookupDTO {
  idFabrica?: number;
  nombreFabrica?: string;
}

export interface ConceptoDTO {
  id: number;
  descripcion: string;
  codigo: string;
  codGrupo: string;
}

export interface EquipoDTO extends LookupDTO {
  codigoCentroCosto: string; // Aquí sí es obligatorio
}

export interface TecnologiaDTO {
  id: number;
  nombre: string;
  version: string;
  descripcion: string;
}

export interface PersonalDTO {
  id: number;
  nombresApellidos: string;
  correo: string;
  rolProyectoDescripcion: string;
}
