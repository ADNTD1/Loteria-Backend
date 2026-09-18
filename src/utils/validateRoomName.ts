export const ROOM_NAME_MIN_LENGTH = 3;
export const ROOM_NAME_MAX_LENGTH = 30;

/**
 * Valida el nombre de una sala. Devuelve el nombre limpio (sin espacios
 * sobrantes) o un mensaje de error describiendo qué está mal.
 */
export const validateRoomName = (name: unknown): { ok: boolean; value: string; error?: string } => {
  if (typeof name !== "string") {
    return { ok: false, value: "", error: "El nombre de la sala debe ser texto" };
  }

  const clean = name.trim();

  if (clean.length < ROOM_NAME_MIN_LENGTH) {
    return { ok: false, value: "", error: `El nombre de la sala debe tener al menos ${ROOM_NAME_MIN_LENGTH} caracteres` };
  }

  if (clean.length > ROOM_NAME_MAX_LENGTH) {
    return { ok: false, value: "", error: `El nombre de la sala no puede pasar de ${ROOM_NAME_MAX_LENGTH} caracteres` };
  }

  if (!/^[\p{L}\p{N} _-]+$/u.test(clean)) {
    return { ok: false, value: "", error: "El nombre de la sala solo puede tener letras, números, espacios, guiones y guiones bajos" };
  }

  return { ok: true, value: clean };
};
