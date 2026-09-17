export interface PersonalInternoResponseDTO {
  id: number;
  idUsuario: number | null;
  dni: string;
  nombresApellidos: string;
  correo: string;
  codRolProyecto: string;
  rolProyectoDescripcion: string;
  idGerencia: number;
  gerenciaNombre: string;
  idEquipo: number;
  equipoNombre: string;
}

export interface PersonalInternoRequestDTO {
  idUsuario: number | null;
  dni: string;
  nombresApellidos: string;
  correo: string;
  codRolProyecto: string;
  idEquipo: number | null;
}

export interface UsuarioComboDTO {
  id: number;
  nombre: string;
  dni: string;
  correo: string;
}
