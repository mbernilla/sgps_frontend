import { Component, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router'; // <-- 1. Añadimos ActivatedRoute
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Card } from 'primeng/card';
import { FloatLabel } from 'primeng/floatlabel';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    Card,
    FloatLabel,
    IconField,
    InputIcon,
    InputText,
    Password,
    Button,
    Message,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {

  private readonly fb     = inject(FormBuilder);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute); // <-- 2. Lo inyectamos aquí

  readonly loading  = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly currentYear = new Date().getFullYear();

  readonly form = this.fb.group({
    correo: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    clave:  this.fb.nonNullable.control('', Validators.required),
  });

  login(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    const { correo, clave } = this.form.getRawValue();

    this.auth.login(correo, clave).subscribe({
      next: () => {
        this.loading.set(false);
        console.log('¿Está logueado según el servicio?:', this.auth.isLoggedIn());

        // 👇 3. LA MAGIA DEL RETURN URL 👇
        // Leemos la URL a la que quería ir antes de ser bloqueado por el Guard
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/requerimientos';
        console.log('Redirigiendo a:', returnUrl);

        // Usamos navigateByUrl para respetar toda la cadena con sus "?" y "&"
        this.router.navigateByUrl(returnUrl);
      },
      error: err => {
        this.loading.set(false);
        this.errorMsg.set(
          err.status === 401
            ? 'Credenciales incorrectas. Verifica tu correo y contraseña.'
            : 'No se pudo conectar al servidor. Intenta nuevamente.'
        );
      },
    });
  }
}
