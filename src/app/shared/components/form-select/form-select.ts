import { Component, Input, inject } from '@angular/core';
import { ControlContainer, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Select } from 'primeng/select';

@Component({
  selector: 'app-form-select',
  // viewProviders asegura que formControlName en el template acceda
  // al FormGroup del componente padre (sin crear un nuevo contexto)
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true }),
    },
  ],
  imports: [ReactiveFormsModule, Select],
  templateUrl: './form-select.html',
  styleUrl: './form-select.scss',
})
export class FormSelectComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) controlName!: string;
  @Input() options: unknown[] = [];
  @Input() optionLabel = 'label';
  @Input() optionValue = 'value';
  @Input() placeholder = 'Seleccione...';

  private readonly controlContainer = inject(ControlContainer, { skipSelf: true });

  get control(): FormControl | null {
    return (this.controlContainer.control?.get(this.controlName) as FormControl) ?? null;
  }

  get showError(): boolean {
    return !!(this.control?.invalid && this.control?.touched);
  }
}
