// ── DTOs del Backend ──────────────────────────────────────────────────────

export interface PersonalDTO {
  id: number;
  idContrato: number;
  idUsuario: number | null;
  dni: string;
  nombresApellidos: string;
  correo: string;
  codRolProyecto: string;
  rolDescripcion: string;
  fechaAlta: string; // YYYY-MM-DD
  fechaBaja: string | null; // YYYY-MM-DD o null
  esActivo: boolean;
}

export interface PersonalRequestDTO {
  idUsuario: number | null;
  dni: string;
  nombresApellidos: string;
  correo: string;
  codRolProyecto: string;
  fechaAlta: string; // YYYY-MM-DD
  fechaBaja: string | null;
}

export interface UsuarioComboDTO {
  id: number;
  nombre: string;
  correo: string;
  dni: string;
}
