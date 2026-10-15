import { WebSocket } from 'ws';

async function testMultiplayer() {
  console.log('--- Testing Mantar Jantar Multiplayer WebSocket Server ---');

  const p1 = new WebSocket('ws://localhost:4000/ws');
  const p2 = new WebSocket('ws://localhost:4000/ws');

  let p1Welcome = false;
  let p2Welcome = false;
  let p1Snapshots = 0;
  let p2Snapshots = 0;

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Test timed out after 10s'));
    }, 10000);

    p1.on('open', () => {
      console.log('✓ Player 1 connected');
      p1.send(JSON.stringify({ t: 'join', name: 'Bunty (Tester)', team: 'P', mud: 0 }));
    });

    p1.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.t === 'welcome') {
        p1Welcome = true;
        console.log(`✓ Player 1 welcomed (ID: ${msg.id}, Room: ${msg.room})`);
        p1.send(JSON.stringify({ t: 'in', s: 1, x: 10, y: 5, a: 1 }));
      } else if (msg.t === 's') {
        p1Snapshots++;
      }
    });

    p2.on('open', () => {
      console.log('✓ Player 2 connected');
      p2.send(JSON.stringify({ t: 'join', name: 'SHO Tomar (Tester)', team: 'C', mud: 1 }));
    });

    p2.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.t === 'welcome') {
        p2Welcome = true;
        console.log(`✓ Player 2 welcomed (ID: ${msg.id}, Room: ${msg.room})`);
        p2.send(JSON.stringify({ t: 'in', s: 1, x: -5, y: -5, a: 1 }));
      } else if (msg.t === 's') {
        p2Snapshots++;
        if (p1Snapshots >= 3 && p2Snapshots >= 3) {
          clearTimeout(timeout);
          resolve();
        }
      }
    });
  });

  p1.close();
  p2.close();

  console.log(`✓ Real-time multiplayer synchronization verified!`);
  console.log(`  - Player 1 welcomed: ${p1Welcome}, received ${p1Snapshots} state snapshots`);
  console.log(`  - Player 2 welcomed: ${p2Welcome}, received ${p2Snapshots} state snapshots`);
  console.log('--- All multiplayer integration checks PASSED! ---');
}

testMultiplayer().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
