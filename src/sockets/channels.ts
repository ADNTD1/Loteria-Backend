// Canal del lobby: todos los conectados reciben la lista de salas disponibles.
export const LOBBY_CHANNEL = "lobby";

// Canal personal por jugador: se usa para mandarle SOLO su tablero.
export const userChannel = (accountNumber: string) => `user:${accountNumber}`;
