import { describe, expect, it } from 'vitest';
import { transicion } from '../../src/documento/estado-guardado';

describe('máquina de estados de guardado', () => {
  it('marca sucio al editar y limpio al guardar', () => {
    let estado = transicion('limpia', 'editar');
    expect(estado).toBe('sucia');
    estado = transicion(estado, 'guardar_iniciado');
    expect(estado).toBe('guardando');
    estado = transicion(estado, 'guardado_ok');
    expect(estado).toBe('limpia');
  });

  it('entra en conflicto ante cambio externo y no pierde el estado sucio al resolver', () => {
    const estado = transicion('sucia', 'cambio_externo');
    expect(estado).toBe('conflicto');
    expect(transicion(estado, 'conflicto_resuelto')).toBe('sucia');
  });

  it('registra error de guardado sin marcar limpio', () => {
    expect(transicion('guardando', 'guardado_error')).toBe('error');
    expect(transicion('error', 'guardar_iniciado')).toBe('guardando');
  });

  it('restaurar un borrador deja el documento sucio', () => {
    expect(transicion('limpia', 'borrador_restaurado')).toBe('sucia');
  });
});
