import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service'; // Verifica que esta ruta sea la correcta en tu proyecto
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, MenuModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class LayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isSidebarCollapsed = signal<boolean>(true);

  // El signal comienza como null
  usuarioActual = signal<{ nombre: string, email: string, iniciales: string } | null>(null);

  // Opciones del menú desplegable de usuario
  userMenuItems: MenuItem[] = [];

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

    // Inicializamos las opciones del menú de PrimeNG
    this.userMenuItems = [
      {
        label: 'Configuración',
        icon: 'pi pi-cog',
        command: () => { /* Aquí puedes agregar navegación al perfil en el futuro */ }
      },
      { separator: true },
      {
        label: 'Cerrar Sesión',
        icon: 'pi pi-sign-out',
        // Inyectamos clases de Tailwind para que resalte en rojo
        styleClass: 'text-red-500 font-medium hover:bg-red-50',
        command: () => this.logout()
      }
    ];
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

  // Método para cerrar sesión
  logout(): void {
    this.authService.logout(); // Limpia el localStorage o las cookies
    this.router.navigate(['/login']);
  }
}
