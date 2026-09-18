import { io } from 'socket.io-client';

const apiUrl = 'http://localhost:3000';

async function run() {
  const loginRes = await fetch(apiUrl + '/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: 'test-device-1' })
  });
  const { user, token } = await loginRes.json();
  
  const socket = io(apiUrl, {
    auth: { token },
    transports: ['websocket']
  });

  socket.on('connect', () => {
    socket.emit('room:create', { name: 'Test Room', maxPlayers: 10, alias: 'Host' }, async (res) => {
      console.log('Create Res:', res);
      if (res.ok) {
        const code = res.data.code;
        console.log('Got code:', code);
        
        const loginRes2 = await fetch(apiUrl + '/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId: 'test-device-2' })
        });
        const { user: user2, token: token2 } = await loginRes2.json();
        
        const socket2 = io(apiUrl, { auth: { token: token2 }, transports: ['websocket'] });
        socket2.on('connect', () => {
            socket2.emit('room:join', { code, alias: 'Player2' }, (res2) => {
                console.log('Join Res:', res2);
                process.exit(0);
            });
        });
      } else {
        process.exit(1);
      }
    });
  });
}
run();
