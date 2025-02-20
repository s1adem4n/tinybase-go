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

let receive;
// send function is defined in golang

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
synchronizer.startSync().then(() => console.log('syncing'));
