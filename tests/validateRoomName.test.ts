import { describe, it, expect } from 'vitest';
import { validateRoomName } from '../src/utils/validateRoomName.js';

describe('validateRoomName', () => {
  it('acepta un nombre válido y lo devuelve limpio', () => {
    const result = validateRoomName('  La Cantina  ');
    expect(result.ok).toBe(true);
    expect(result.value).toBe('La Cantina');
  });

  it('rechaza nombres que no sean texto', () => {
    expect(validateRoomName(123).ok).toBe(false);
    expect(validateRoomName(undefined).ok).toBe(false);
    expect(validateRoomName(null).ok).toBe(false);
  });

  it('rechaza nombres de menos de 3 caracteres', () => {
    const result = validateRoomName('ab');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('al menos 3 caracteres');
  });

  it('rechaza nombres de más de 30 caracteres', () => {
    const result = validateRoomName('a'.repeat(31));
    expect(result.ok).toBe(false);
    expect(result.error).toContain('30 caracteres');
  });

  it('rechaza caracteres especiales', () => {
    expect(validateRoomName('Sala <script>').ok).toBe(false);
    expect(validateRoomName('Sala!!!').ok).toBe(false);
  });

  it('acepta acentos, ñ, números, guiones y guiones bajos', () => {
    expect(validateRoomName('El Corazón 2').ok).toBe(true);
    expect(validateRoomName('Sala_ñ-01').ok).toBe(true);
  });
});
