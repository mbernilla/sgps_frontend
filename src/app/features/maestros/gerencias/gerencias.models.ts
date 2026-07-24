// ── DTOs del Backend ──────────────────────────────────────────────────────

export interface GerenciaDTO {
  id: number;
  nombre: string;
  esActivo: boolean;
}

export interface EquipoDTO {
  id: number;
  idGerencia: number;
  nombre: string;
  siglas: string;
  centroCosto: string;
  esActivo: boolean;
}

// ── Payloads para Creación y Edición ──────────────────────────────────────

export interface GerenciaCreateDTO {
  nombre: string;
}

export interface GerenciaUpdateDTO {
  nombre: string;
}

export interface EquipoCreateDTO {
  nombre: string;
  siglas: string;
  centroCosto: string;
}

export interface EquipoUpdateDTO {
  nombre: string;
  siglas: string;
  centroCosto: string;
}
