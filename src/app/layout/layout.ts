import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service'; // Ajusta la ruta

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class LayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);

  isSidebarCollapsed = signal<boolean>(false);

  // El signal comienza como null
  usuarioActual = signal<{ nombre: string, email: string, iniciales: string } | null>(null);

  ngOnInit(): void {
    const payload = this.authService.getPayload();

    if (payload) {
      // Extraemos los datos reales del JWT
      const nombre = payload.nombre_completo || 'Usuario';
      const email = payload.sub; // El 'sub' es el correo en tu JWT

      this.usuarioActual.set({
        nombre: nombre,
        email: email,
        iniciales: this.extraerIniciales(nombre)
      });
    }
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed.update(state => !state);
  }

  private extraerIniciales(nombre: string): string {
    if (!nombre) return 'U';

    // Divide el nombre por espacios y quita espacios vacíos
    const partes = nombre.trim().split(/\s+/);

    if (partes.length >= 2) {
      // Toma la primera letra del primer nombre y del primer apellido
      return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    }

    return partes[0].substring(0, 2).toUpperCase();
  }
}
