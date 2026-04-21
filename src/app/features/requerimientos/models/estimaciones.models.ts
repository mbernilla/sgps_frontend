export type EstadoEstimacion = 'EST_BOR' | 'EST_APR' | 'EST_REC' | 'EST_ANU';
export type CodigoEstimacion = 'EST-INI' | 'EST-ANA' | 'EST-DIS' | 'RFC';

export interface FaseEstimacionRequestDTO {
  codFase: string;
  horasEstimadas: number;
  fechaInicioPlan: string;
  fechaFinPlan: string;
}

export interface EstimacionRequestDTO {
  idRequerimiento?: number;
  codigoEstimacion?: string;
  idModificadorTarifa: number;
  fechaEstimacion: string;
  comentario: string;
  fases: FaseEstimacionRequestDTO[];
}

export interface FaseEstimacionDTO {
  id: number;
  codFase: string;
  faseDescripcion: string;
  horasEstimadas: number;
  fechaInicioPlan: string;
  fechaFinPlan: string;
}

export interface EstimacionDTO {
  id: number;
  idRequerimiento: number;
  codigoEstimacion: CodigoEstimacion;
  codigoEstimacionDescripcion: string;
  idModificadorTarifa: number;
  modificadorTarifaDescripcion: string;
  codEstado: EstadoEstimacion;
  estadoDescripcion: string;
  fechaEstimacion: string;
  fechaAprobacion: string | null;
  horasEstimadas: number;
  comentario: string;
  motivoRechazo?: string;
  fases: FaseEstimacionDTO[];
}

export interface ModificadorTarifaDTO {
  id: number;
  descripcion: string;
  porcentaje: number;
}

export interface FaseMaestraDTO {
  id: string;
  nombre: string;
}
