import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { ProgressSpinner } from 'primeng/progressspinner';

import { ConciliacionService } from '../services/conciliacion.service';
import { CicloContratoDTO } from '../models/conciliacion.models';

@Component({
  selector: 'app-ciclos-list',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TableModule,
    TagModule,
    Toast,
    ProgressSpinner,
  ],
  providers: [MessageService],
  templateUrl: './ciclos-list.html',
  styleUrl: './ciclos-list.scss',
})
export class CiclosListComponent implements OnInit {
  private readonly router  = inject(Router);
  private readonly service = inject(ConciliacionService);
  private readonly msg     = inject(MessageService);

  readonly ciclos   = signal<CicloContratoDTO[]>([]);
  readonly cargando = signal(false);

  ngOnInit(): void {
    this.cargarCiclos();
  }

  private cargarCiclos(): void {
    this.cargando.set(true);
    this.service.getCiclosMaestro().subscribe({
      next: res => {
        this.ciclos.set(res.data);
        this.cargando.set(false);
      },
      error: err => {
        this.cargando.set(false);
        this.msg.add({
          severity: 'error', summary: 'Error',
          detail: err.error?.mensaje || 'No se pudieron cargar los ciclos de conciliación.',
          life: 5000,
        });
      },
    });
  }

  irADetalle(idCiclo: number): void {
    this.router.navigate(['/conciliaciones/gestion', idCiclo]);
  }
}
