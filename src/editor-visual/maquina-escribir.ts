/**
 * Máquina de escribir (FR-015): mantiene la línea activa centrada
 * verticalmente. No usa animaciones y respeta `prefers-reduced-motion`.
 */
export class MaquinaEscribir {
  private readonly raiz: HTMLElement;
  private activa = false;
  private readonly alDesplazar: () => void;

  constructor(raiz: HTMLElement) {
    this.raiz = raiz;
    this.alDesplazar = () => this.centrar();
  }

  activar(): void {
    if (this.activa) return;
    this.activa = true;
    this.raiz.classList.add('maquina-escribir');
    this.raiz.addEventListener('keyup', this.alDesplazar);
    this.raiz.addEventListener('click', this.alDesplazar);
    this.centrar();
  }

  desactivar(): void {
    if (!this.activa) return;
    this.activa = false;
    this.raiz.classList.remove('maquina-escribir');
    this.raiz.removeEventListener('keyup', this.alDesplazar);
    this.raiz.removeEventListener('click', this.alDesplazar);
  }

  get estaActiva(): boolean {
    return this.activa;
  }

  private centrar(): void {
    if (!this.activa) return;
    const seleccion = globalThis.getSelection?.();
    const nodo = seleccion?.focusNode;
    if (!nodo) return;
    const elemento = nodo.nodeType === Node.ELEMENT_NODE
      ? (nodo as HTMLElement)
      : nodo.parentElement;
    elemento?.scrollIntoView({ block: 'center', behavior: 'auto' });
  }
}
