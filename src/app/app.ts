import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialog } from 'primeng/confirmdialog';

@Component({
  selector: 'app-root',
  imports: [ConfirmDialog, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
