import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service'; // Verifica que esta ruta sea la correcta en tu proyecto
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { FormsModule } from '@angular/forms';

import { ContratoApiService } from '../features/maestros/contratos/service/ContratoApiService';
import { ContextoGlobalService } from '../core/services/contexto-global.service';
import { ContratoSelectorDTO, GrupoContrato } from '../features/maestros/models/contrato-selector.model';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, MenuModule, FormsModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class LayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly contratoApi = inject(ContratoApiService);
  private readonly contextoGlobal = inject(ContextoGlobalService);

  isSidebarCollapsed = signal<boolean>(true);

  // El signal comienza como null
  usuarioActual = signal<{ nombre: string, email: string, iniciales: string } | null>(null);

  // Opciones del menú desplegable de usuario
  userMenuItems: MenuItem[] = [];
  contratosAgrupados: GrupoContrato[] = [];
  idContratoSeleccionado: number | null = null;
  private contratosPlanos: ContratoSelectorDTO[] = [];

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

    this.cargarComboContratos();
  }

  cargarComboContratos(): void {
    this.contratoApi.listarContratosSelector().subscribe({
      next: (data) => {
        this.contratosPlanos = data; // <-- Guardamos la lista plana para búsquedas rápidas
        this.contratosAgrupados = this.agruparPorFabrica(data);

        // Si hay contratos disponibles y no hay ninguno seleccionado globalmente
        if (data.length > 0 && !this.contextoGlobal.idContratoActivo()) {
          this.seleccionarContrato(data[0].id);
        } else {
          // Sincronizar el select con el estado actual
          this.idContratoSeleccionado = this.contextoGlobal.idContratoActivo();
        }
      },
      error: (err) => console.error('Error cargando contratos del selector', err)
    });
  }

  private agruparPorFabrica(contratos: ContratoSelectorDTO[]): GrupoContrato[] {
    const mapa = new Map<string, ContratoSelectorDTO[]>();

    contratos.forEach(contrato => {
      if (!mapa.has(contrato.fabricaNombre)) {
        mapa.set(contrato.fabricaNombre, []);
      }
      mapa.get(contrato.fabricaNombre)!.push(contrato);
    });

    return Array.from(mapa.entries()).map(([fabricaNombre, lista]) => ({
      fabricaNombre,
      contratos: lista
    }));
  }

  onCambioContrato(nuevoId: number): void {
    const idNumerico = Number(nuevoId);
    this.seleccionarContrato(idNumerico, true);
  }

  private seleccionarContrato(id: number, isManual: boolean = false): void {
    this.idContratoSeleccionado = id;

    const contratoCompleto = this.contratosPlanos.find(c => c.id === id);

    if (contratoCompleto) {
      this.contextoGlobal.setContratoActivo({
        id: contratoCompleto.id,
        codigoContrato: contratoCompleto.codigoContrato,
        fabricaNombre: contratoCompleto.fabricaNombre
      });

      // --- LÓGICA DE REDIRECCIÓN INTELIGENTE ---

      // 1. Obtenemos la ruta limpia (sin parámetros tipo ?id=1)
      const urlActual = this.router.url.split('?')[0];

      // 2. Definimos nuestras pantallas "Padre" (donde es seguro quedarse)
      const rutasPadreSeguras = [
        '/requerimientos',
        '/informes',
        '/conciliaciones/maestro',
        '/maestros/sistemas',
        '/maestros/catalogo-entregables',
        '/maestros/contratos-slas'
      ];

      // 3. Verificamos si estamos en una subpágina
      if (!rutasPadreSeguras.includes(urlActual)) {

        // Lo devolvemos al padre correspondiente según la sección donde esté
        if (urlActual.startsWith('/conciliaciones')) {
          this.router.navigate(['/conciliaciones/maestro']);
        } else if (urlActual.startsWith('/maestros')) {
          this.router.navigate(['/maestros/sistemas']);
        } else {
          // Por defecto, si estaba en crear requerimiento, editar, etc.
          this.router.navigate(['/requerimientos']);
        }

      }

      // Si el usuario SÍ estaba en una ruta padre (ej. /conciliaciones/maestro),
      // no hacemos ningún router.navigate(). El effect() que pusimos en esa
      // pantalla se encargará de refrescar la grilla silenciosamente.
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

  // Método para cerrar sesión
  logout(): void {
    this.authService.logout(); // Limpia el localStorage o las cookies
    this.router.navigate(['/login']);
  }
}
