import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequerimientoCabeceraDTO } from '../../../core/models/requerimiento-cabecera.model';
import { ProgressSpinner } from 'primeng/progressspinner';

@Component({
  selector: 'app-requerimiento-cabecera',
  standalone: true,
  imports: [CommonModule, ProgressSpinner],
  templateUrl: './requerimiento-cabecera.html',
  styleUrl: './requerimiento-cabecera.scss',
})
export class RequerimientoCabeceraComponent {
  @Input() cabecera: RequerimientoCabeceraDTO | null = null;
  @Input() cargando = false;

  getBadgeClass(): string {
    if (!this.cabecera) return '';
    const estado = this.cabecera.estadoDescripcion.toLowerCase();
    if (estado.includes('registrado')) return 'rcab-badge--success';
    if (estado.includes('rechazado') || estado.includes('anulado')) return 'rcab-badge--danger';
    if (estado.includes('en') || estado.includes('pendiente')) return 'rcab-badge--warning';
    return 'rcab-badge--secondary';
  }
}
