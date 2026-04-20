// ─────────────────────────────────────────────────────────────────────────────
// Interfaces del CRUD de Sistemas y Módulos
// Distintas de los LookupDTO de maestra.model.ts (que sólo tienen id/nombre)
// ─────────────────────────────────────────────────────────────────────────────

export interface SistemaAdminDTO {
  id: number;
  nombre: string;
  descripcion: string;
  codGrupoTecnologico: string;
  grupoTecnologico: string;
  esActivo: boolean;
}

export interface ModuloAdminDTO {
  id: number;
  idSistema: number;
  nombre: string;
  esActivo: boolean;
}

export interface SistemaCreateDTO {
  nombre: string;
  descripcion: string;
  codGrupoTecnologico: string;
}

export interface ModuloCreateDTO {
  nombre: string;
}

/** Combo para el p-select de Grupo Tecnológico.
 *  El backend devuelve {id: 'GT1', nombre: 'GT1 (SAP, ERP)'} via LookupResponseDTO.
 *  El campo `id` es string porque viene de maestro_conceptos.id_codigo (VARCHAR).
 */
export interface GrupoTecOpt {
  id: string;
  nombre: string;
}
