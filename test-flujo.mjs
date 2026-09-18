// Smoke test del flujo de sockets: crear sala -> unirse -> broadcast -> salir.
// Ejecutar con: node test-flujo.mjs (requiere el backend corriendo)
import { io } from 'socket.io-client';

const URL = 'http://localhost:3000';

const login = async (accountNumber) => {
  const res = await fetch(`${URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountNumber }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`login falló: ${data.message}`);
  return data.data.token;
};

const logout = async (accountNumber) => {
  await fetch(`${URL}/api/users/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountNumber }),
  });
};

const conectar = (token, etiqueta) => {
  const socket = io(URL, { auth: { token }, transports: ['websocket'] });
  socket.on('connect', () => console.log(`[${etiqueta}] conectado`));
  socket.on('connect_error', (e) => console.error(`[${etiqueta}] connect_error:`, e.message));
  socket.on('room:players', (jugadores) => console.log(`[${etiqueta}] room:players ->`, JSON.stringify(jugadores)));
  socket.on('game:started', (data) => console.log(`[${etiqueta}] game:started ->`, JSON.stringify(data)));
  socket.on('game:board', (board) => console.log(`[${etiqueta}] game:board -> tablero de ${board.cards.length} cartas para ${board.accountNumber}`));
  socket.on('card:called', (data) => console.log(`[${etiqueta}] card:called ->`, `${data.card.id}. ${data.card.name}`, `(llamada #${data.calledCount})`));
  return socket;
};

const emitir = (socket, evento, payload) =>
  new Promise((resolve, reject) => {
    socket.emit(evento, payload, (resp) =>
      resp.ok ? resolve(resp.data) : reject(new Error(resp.message)),
    );
  });

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const token1 = await login('20230001');
const s1 = conectar(token1, 'host');
await esperar(1500);

const sala = await emitir(s1, 'room:create', { name: 'Sala de prueba', maxPlayers: 4, alias: 'ElGallo' });
console.log('Sala creada:', sala.code, '| maxPlayers:', sala.maxPlayers, '| tablero host:', sala.board?.cards?.length, 'cartas');

const token2 = await login('20230002');
const s2 = conectar(token2, 'jugador2');
await esperar(1500);

const join = await emitir(s2, 'room:join', { code: sala.code, alias: 'LaRana' });
console.log('Join ok | alreadyJoined:', join.alreadyJoined, '| aliases:', JSON.stringify(join.aliases), '| tablero:', join.board?.cards?.length, 'cartas');

await esperar(2500); // tiempo para recibir los broadcasts room:players

// Salir y volver a unirse (leave funciona en WAITING)
await emitir(s2, 'room:leave', { code: sala.code });
console.log('Jugador 2 salió de la sala');
await esperar(1500);
await emitir(s2, 'room:join', { code: sala.code, alias: 'LaRana' });
console.log('Jugador 2 se reincorporó');
await esperar(1500);

// El host inicia la partida: todos reciben su tablero y el broadcast game:started
const inicio = await emitir(s1, 'game:start', { code: sala.code });
console.log('game:start ok ->', JSON.stringify(inicio));
await esperar(5000); // el cantor canta cada 4 s: debe llegar al menos un card:called

// Un jugador que no es host NO puede iniciar (debe fallar)
try {
  await emitir(s2, 'game:start', { code: sala.code });
  console.log('ERROR: un no-host pudo iniciar la partida');
} catch (e) {
  console.log('No-host rechazado correctamente:', e.message);
}

// El host detiene la partida para limpiar la sala (queda FINISHED en BD)
await emitir(s1, 'game:stop', { code: sala.code });
console.log('Partida detenida por el host');
await esperar(1000);

s1.close();
s2.close();
await logout('20230001');
await logout('20230002');
console.log('FIN: flujo completo sin errores');
process.exit(0);
