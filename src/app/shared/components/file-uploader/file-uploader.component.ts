import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';

// Definimos los estados posibles de un archivo en nuestro componente
export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

// Envolvemos el archivo real con metadata visual
export interface UploadableFile {
  id: string; // Un ID único temporal para identificarlo en la lista
  file: File;
  progress: number; // 0 a 100
  status: UploadStatus;
  errorMessage?: string;
}

@Component({
  selector: 'app-file-uploader',
  standalone: true,
  imports: [CommonModule],
  providers: [MessageService],
  templateUrl: './file-uploader.component.html',
  styleUrl: './file-uploader.component.scss'
})
export class FileUploaderComponent {

  // ── 1. EL CONTRATO (Enchufa y Usa) ──────────────────────────────────

  @Input() multiple: boolean = false;
  @Input() maxFileSizeMb: number = 10;
  @Input() allowedExtensions: string = '*'; // Ej: '.pdf,.docx,.jpg' o '*'
  @Input() title: string = 'Arrastra y suelta tus archivos aquí';
  @Input() subtitle: string = 'o haz clic para explorar';

  @Input() set clearTrigger(value: boolean) {
    this.files.set([]);
    this.isDragging.set(false);
  }

  // El Output no solo emite el archivo, sino que expone funciones (callbacks)
  // para que el Padre (entregables-panel) pueda "avisarle" al hijo cómo va la subida.
  @Output() onFileAccepted = new EventEmitter<{
    file: File,
    onProgress: (pct: number) => void,
    onSuccess: () => void,
    onError: (msg: string) => void
  }>();

  // ── 2. ESTADO INTERNO DEL COMPONENTE ────────────────────────────────

  // Detecta si el usuario está arrastrando algo encima de la caja
  isDragging = signal(false);

  // La lista de archivos que se están mostrando en la UI
  files = signal<UploadableFile[]>([]);

  constructor(private msg: MessageService) {}

  // ── 3. LÓGICA DE DRAG & DROP ────────────────────────────────────────

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const droppedFiles = event.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      this.handleFiles(Array.from(droppedFiles));
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
      input.value = ''; // Resetea el input para poder seleccionar el mismo archivo de nuevo si se borra
    }
  }

  // ── 4. VALIDACIÓN DE REGLAS DE NEGOCIO (PRE-FLIGHT) ─────────────────

  private handleFiles(newFiles: File[]): void {
    if (!this.multiple && newFiles.length > 1) {
      this.toastError('Solo puedes subir un archivo a la vez.');
      newFiles = [newFiles[0]]; // Si es único y le tiran 5, solo agarramos el primero
    }

    newFiles.forEach(file => {
      if (this.isValidFile(file)) {
        this.addAndEmitFile(file);
      }
    });
  }

  private isValidFile(file: File): boolean {
    // 1. Validar Tamaño
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > this.maxFileSizeMb) {
      this.toastError(`El archivo "${file.name}" supera el límite de ${this.maxFileSizeMb}MB.`);
      return false;
    }

    // 2. Validar Extensión
    if (this.allowedExtensions !== '*') {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      // Limpiamos la cadena de la BD (quita espacios, convierte a minúsculas, separa por coma)
      const allowedArr = this.allowedExtensions.toLowerCase().split(',').map(e => e.trim());

      if (!allowedArr.includes(extension)) {
        this.toastError(`El archivo "${file.name}" no es válido. Formatos permitidos: ${this.allowedExtensions}`);
        return false;
      }
    }

    return true;
  }

  // ── 5. ORQUESTACIÓN CON EL PADRE ────────────────────────────────────

  private addAndEmitFile(file: File): void {
    const newFileItem: UploadableFile = {
      id: Math.random().toString(36).substring(2, 9), // Generador de ID rápido
      file,
      progress: 0,
      status: 'pending'
    };

    // Si es múltiple lo agregamos a la lista, si es único reemplazamos la lista
    this.files.update(current => this.multiple ? [...current, newFileItem] : [newFileItem]);

    // Lo marcamos como subiendo
    this.updateFileState(newFileItem.id, { status: 'uploading' });

    // ¡La Magia del Componente Agnóstico!
    // Emitimos el archivo al padre, pero le pasamos 3 "controles remotos" (funciones)
    // para que el padre controle la barra de progreso y el estado desde afuera.
    this.onFileAccepted.emit({
      file,
      onProgress: (pct: number) => this.updateFileState(newFileItem.id, { progress: pct }),
      onSuccess: () => this.updateFileState(newFileItem.id, { status: 'success', progress: 100 }),
      onError: (msg: string) => this.updateFileState(newFileItem.id, { status: 'error', errorMessage: msg })
    });
  }

  private updateFileState(id: string, updates: Partial<UploadableFile>): void {
    this.files.update(current =>
      current.map(f => f.id === id ? { ...f, ...updates } : f)
    );
  }

  // ── 6. ACCIONES DE USUARIO ──────────────────────────────────────────

  removeFile(id: string): void {
    this.files.update(current => current.filter(f => f.id !== id));
    // Opcional: Si quisieras cancelar la petición HTTP en curso,
    // tendrías que emitir un evento 'onCancel' aquí.
  }

  private toastError(detail: string): void {
    this.msg.add({ severity: 'error', summary: 'Archivo no permitido', detail, life: 5000 });
  }

  // ── 7. HELPERS DE UI ────────────────────────────────────────────────

  getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      'pdf': 'pi-file-pdf text-red-500',
      'doc': 'pi-file-word text-blue-600',
      'docx': 'pi-file-word text-blue-600',
      'xls': 'pi-file-excel text-green-600',
      'xlsx': 'pi-file-excel text-green-600',
      'jpg': 'pi-image text-purple-500',
      'jpeg': 'pi-image text-purple-500',
      'png': 'pi-image text-purple-500'
    };
    return iconMap[ext || ''] || 'pi-file text-gray-500';
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
