import { createMergeableStore } from 'tinybase';
import { createWsSynchronizer } from 'tinybase/synchronizers/synchronizer-ws-client';

const store = createMergeableStore();
const ws = new WebSocket('ws://localhost:8080/ws/banana');
const synchronizer = await createWsSynchronizer(store, ws);
await synchronizer.startSync();

console.log(store.getJson());

ws.close();
