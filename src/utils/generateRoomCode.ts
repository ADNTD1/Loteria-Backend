/**
 * Genera un código de sala aleatorio con el formato `XXX-XXX`.
 * 
 * El código generado consta de dos partes separadas por un guion:
 * - Los primeros 3 caracteres son letras mayúsculas seleccionadas al azar (A-Z).
 * - Los últimos 3 caracteres son caracteres alfanuméricos seleccionados al azar (A-Z, 0-9).
 * 
 * @example
 * const code = generateRoomCode(); // Retorna algo como "ABC-1X9"
 * 
 * @returns {string} Una cadena de 7 caracteres que representa el código de la sala.
 */

export function generateRoomCode(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let code = "";

  for (let i = 0; i < 3; i++) {
    const randomIndex = Math.floor(Math.random() * letters.length);
    code += letters[randomIndex];
  }

  code += "-";

  for (let i = 0; i < 3; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }

  return code;
}
