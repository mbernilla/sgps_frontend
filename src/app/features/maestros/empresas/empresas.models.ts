// ── DTOs del Backend ──────────────────────────────────────────────────────

export interface EmpresaResponseDTO {
  id: number;
  ruc: string;
  razonSocial: string;
  codTipo: string;
  tipoDescripcion: string;
}

export interface EmpresaRequestDTO {
  ruc: string;
  razonSocial: string;
  codTipo: string;
}

