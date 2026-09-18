// Alias temporales por sala: roomCode -> (accountNumber -> alias)
// Viven solo en memoria y se pierden cuando el servidor reinicia o la sala se limpia.
const roomAliases = new Map<string, Map<string, string>>();

export const ALIAS_MIN_LENGTH = 3;
export const ALIAS_MAX_LENGTH = 30;

/**
 * Valida el formato de un alias. Devuelve el alias limpio (sin espacios
 * sobrantes) o lanza un mensaje de error describiendo qué está mal.
 */
export const validateAlias = (alias: unknown): { ok: boolean; value: string; error?: string } => {
  if (typeof alias !== "string") {
    return { ok: false, value: "", error: "El alias debe ser texto" };
  }

  const clean = alias.trim();

  if (clean.length < ALIAS_MIN_LENGTH) {
    return { ok: false, value: "", error: `El alias debe tener al menos ${ALIAS_MIN_LENGTH} caracteres` };
  }

  if (clean.length > ALIAS_MAX_LENGTH) {
    return { ok: false, value: "", error: `El alias no puede pasar de ${ALIAS_MAX_LENGTH} caracteres` };
  }

  if (!/^[\p{L}\p{N} _-]+$/u.test(clean)) {
    return { ok: false, value: "", error: "El alias solo puede tener letras, números, espacios, guiones y guiones bajos" };
  }

  return { ok: true, value: clean };
};

export const AliasesStore = {
  /** Registra el alias de un jugador en una sala. */
  set(roomCode: string, accountNumber: string, alias: string): void {
    if (!roomAliases.has(roomCode)) {
      roomAliases.set(roomCode, new Map());
    }
    roomAliases.get(roomCode)!.set(accountNumber, alias);
  },

  get(roomCode: string, accountNumber: string): string | undefined {
    return roomAliases.get(roomCode)?.get(accountNumber);
  },

  /** true si ese alias ya lo está usando OTRO jugador en la misma sala. */
  isTaken(roomCode: string, accountNumber: string, alias: string): boolean {
    const aliases = roomAliases.get(roomCode);
    if (!aliases) return false;

    for (const [account, existing] of aliases.entries()) {
      if (account !== accountNumber && existing.toLowerCase() === alias.toLowerCase()) {
        return true;
      }
    }
    return false;
  },

  /** Copia plana de todos los alias de una sala: { accountNumber: alias }. */
  getAllForRoom(roomCode: string): Record<string, string> {
    const aliases = roomAliases.get(roomCode);
    if (!aliases) return {};
    return Object.fromEntries(aliases);
  },

  /** Quita el alias de un jugador (cuando sale de la sala). */
  remove(roomCode: string, accountNumber: string): void {
    roomAliases.get(roomCode)?.delete(accountNumber);
  },

  clearRoom(roomCode: string): void {
    roomAliases.delete(roomCode);
  },
};