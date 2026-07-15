export interface ContratoSelectorDTO {
  id: number;
  codigoContrato: string;
  fabricaNombre: string;
}

// Interfaz para armar los grupos en la vista
export interface GrupoContrato {
  fabricaNombre: string;
  contratos: ContratoSelectorDTO[];
}
