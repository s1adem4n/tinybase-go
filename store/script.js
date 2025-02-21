const { createMergeableStore } = require('./module/index.cjs');
const {
  createCustomSynchronizer,
} = require('./module/synchronizers/index.cjs');

// constants
const UNDEFINED = '\uFFFC';
const EMPTY_STRING = '';
const MESSAGE_SEPARATOR = '\n';

const jsonString = JSON.stringify;
const jsonParse = JSON.parse;

// payload encoding
const jsonStringWithUndefined = (obj) =>
  jsonString(obj, (_key, value) => (value === void 0 ? UNDEFINED : value));
const createRawPayload = (clientId, remainder) =>
  clientId + MESSAGE_SEPARATOR + remainder;
const createPayload = (toClientId, ...args) =>
  createRawPayload(
    toClientId != null ? toClientId : EMPTY_STRING,
    jsonStringWithUndefined(args)
  );

// payload parsing
const jsonParseWithUndefined = (str) =>
  jsonParse(str, (_key, value) => (value === UNDEFINED ? undefined : value));
const slice = (str, start, end) => str.slice(start, end);
const ifPayloadValid = (payload, then) => {
  const splitAt = payload.indexOf(MESSAGE_SEPARATOR);
  if (splitAt !== -1) {
    then(slice(payload, 0, splitAt), slice(payload, splitAt + 1));
  } else {
    console.error('Invalid payload', payload);
  }
};
const receivePayload = (payload, receive) =>
  ifPayloadValid(payload, (fromClientId, remainder) =>
    receive(fromClientId, ...jsonParseWithUndefined(remainder))
  );

const store = createMergeableStore();

// receive function is exported to golang
let receive;
// send function is set in golang

const synchronizer = createCustomSynchronizer(
  store,
  (toClientId, requestId, message, body) => {
    const payload = createPayload(toClientId, requestId, message, body);
    send(payload);
  },
  (fn) => {
    receive = (payload) => {
      receivePayload(payload, fn);
    };
  },
  () => {},
  1,
  undefined,
  undefined,
  undefined
);
// try to load existing state (set from golang)
synchronizer
  .startSync(persisted ? jsonParse(persisted) : undefined)
  .then(() => {
    // onChange is set from golang
    this.store.addTablesListener((s) => setPersisted(s.getJson()));
    this.store.addValuesListener((s) => setPersisted(s.getJson()));
  });
