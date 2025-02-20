'use strict';

const EMPTY_STRING = '';
const strSplit = (str, separator = EMPTY_STRING, limit) =>
  str.split(separator, limit);

const promise = Promise;
const GLOBAL = globalThis;
const THOUSAND = 1e3;
const startTimeout = (callback, sec = 0) =>
  setTimeout(callback, sec * THOUSAND);
const math = Math;
const mathFloor = math.floor;
const isUndefined = (thing) => thing == void 0;
const ifNotUndefined = (value, then, otherwise) =>
  isUndefined(value) ? (otherwise == null ? void 0 : otherwise()) : then(value);
const isArray = (thing) => Array.isArray(thing);
const size = (arrayOrString) => arrayOrString.length;
const test = (regex, subject) => regex.test(subject);
const promiseNew = (resolver) => new promise(resolver);
const errorNew = (message) => {
  throw new Error(message);
};

const arrayForEach = (array, cb) => array.forEach(cb);
const arrayMap = (array, cb) => array.map(cb);
const arrayReduce = (array, cb, initial) => array.reduce(cb, initial);
const arrayClear = (array, to) => array.splice(0, to);
const arrayPush = (array, ...values) => array.push(...values);
const arrayShift = (array) => array.shift();

const object = Object;
const getPrototypeOf = (obj) => object.getPrototypeOf(obj);
const objEntries = object.entries;
const isObject = (obj) =>
  !isUndefined(obj) &&
  ifNotUndefined(
    getPrototypeOf(obj),
    (objPrototype) =>
      objPrototype == object.prototype ||
      isUndefined(getPrototypeOf(objPrototype)),

    /* istanbul ignore next */
    () => true,
  );
const objIds = object.keys;
const objFreeze = object.freeze;
const objNew = (entries = []) => object.fromEntries(entries);
const objHas = (obj, id) => id in obj;
const objForEach = (obj, cb) =>
  arrayForEach(objEntries(obj), ([id, value]) => cb(value, id));
const objSize = (obj) => size(objIds(obj));
const objIsEmpty = (obj) => isObject(obj) && objSize(obj) == 0;
const objEnsure = (obj, id, getDefaultValue) => {
  if (!objHas(obj, id)) {
    obj[id] = getDefaultValue();
  }
  return obj[id];
};

const collSize = (coll) => {
  var _a;
  return (_a = coll == null ? void 0 : coll.size) != null ? _a : 0;
};
const collHas = (coll, keyOrValue) => {
  var _a;
  return (_a = coll == null ? void 0 : coll.has(keyOrValue)) != null
    ? _a
    : false;
};
const collIsEmpty = (coll) => isUndefined(coll) || collSize(coll) == 0;
const collForEach = (coll, cb) => (coll == null ? void 0 : coll.forEach(cb));
const collDel = (coll, keyOrValue) =>
  coll == null ? void 0 : coll.delete(keyOrValue);

const mapNew = (entries) => new Map(entries);
const mapGet = (map, key) => (map == null ? void 0 : map.get(key));
const mapSet = (map, key, value) =>
  isUndefined(value)
    ? (collDel(map, key), map)
    : map == null
      ? void 0
      : map.set(key, value);
const mapEnsure = (map, key, getDefaultValue, hadExistingValue) => {
  if (!collHas(map, key)) {
    mapSet(map, key, getDefaultValue());
  } else {
    hadExistingValue == null ? void 0 : hadExistingValue(mapGet(map, key));
  }
  return mapGet(map, key);
};
const visitTree = (node, path, ensureLeaf, pruneLeaf, p = 0) =>
  ifNotUndefined(
    (ensureLeaf ? mapEnsure : mapGet)(
      node,
      path[p],
      p > size(path) - 2 ? ensureLeaf : mapNew,
    ),
    (nodeOrLeaf) => {
      if (p > size(path) - 2) {
        if (pruneLeaf == null ? void 0 : pruneLeaf(nodeOrLeaf)) {
          mapSet(node, path[p]);
        }
        return nodeOrLeaf;
      }
      const leaf = visitTree(nodeOrLeaf, path, ensureLeaf, pruneLeaf, p + 1);
      if (collIsEmpty(nodeOrLeaf)) {
        mapSet(node, path[p]);
      }
      return leaf;
    },
  );

const stampNew = (value, time) => (time ? [value, time] : [value]);
const getLatestTime = (time1, time2) => {
  var _a;
  return (
    /* istanbul ignore next */
    (_a =
      (time1 != null ? time1 : '') > (time2 != null ? time2 : '')
        ? time1
        : time2) != null
      ? _a
      : ''
  );
};
const stampNewObj = (time = EMPTY_STRING) => stampNew(objNew(), time);

const setNew = (entryOrEntries) =>
  new Set(
    isArray(entryOrEntries) || isUndefined(entryOrEntries)
      ? entryOrEntries
      : [entryOrEntries],
  );
const setAdd = (set, value) => (set == null ? void 0 : set.add(value));

const INTEGER = /^\d+$/;
const getPoolFunctions = () => {
  const pool = [];
  let nextId = 0;
  return [
    (reuse) => {
      var _a;
      return (_a = reuse ? arrayShift(pool) : null) != null
        ? _a
        : EMPTY_STRING + nextId++;
    },
    (id) => {
      if (test(INTEGER, id) && size(pool) < 1e3) {
        arrayPush(pool, id);
      }
    },
  ];
};

const getWildcardedLeaves = (deepIdSet, path = [EMPTY_STRING]) => {
  const leaves = [];
  const deep = (node, p) =>
    p == size(path)
      ? arrayPush(leaves, node)
      : path[p] === null
        ? collForEach(node, (node2) => deep(node2, p + 1))
        : arrayForEach([path[p], null], (id) => deep(mapGet(node, id), p + 1));
  deep(deepIdSet, 0);
  return leaves;
};
const getListenerFunctions = (getThing) => {
  let thing;
  const [getId, releaseId] = getPoolFunctions();
  const allListeners = mapNew();
  const addListener = (
    listener,
    idSetNode,
    path,
    pathGetters = [],
    extraArgsGetter = () => [],
  ) => {
    thing != null ? thing : (thing = getThing());
    const id = getId(1);
    mapSet(allListeners, id, [
      listener,
      idSetNode,
      path,
      pathGetters,
      extraArgsGetter,
    ]);
    setAdd(
      visitTree(idSetNode, path != null ? path : [EMPTY_STRING], setNew),
      id,
    );
    return id;
  };
  const callListeners = (idSetNode, ids, ...extraArgs) =>
    arrayForEach(getWildcardedLeaves(idSetNode, ids), (set) =>
      collForEach(set, (id) =>
        mapGet(allListeners, id)[0](
          thing,
          ...(ids != null ? ids : []),
          ...extraArgs,
        ),
      ),
    );
  const delListener = (id) =>
    ifNotUndefined(mapGet(allListeners, id), ([, idSetNode, idOrNulls]) => {
      visitTree(
        idSetNode,
        idOrNulls != null ? idOrNulls : [EMPTY_STRING],
        void 0,
        (idSet) => {
          collDel(idSet, id);
          return collIsEmpty(idSet) ? 1 : 0;
        },
      );
      mapSet(allListeners, id);
      releaseId(id);
      return idOrNulls;
    });
  const callListener = (id) =>
    ifNotUndefined(
      mapGet(allListeners, id),
      ([listener, , path = [], pathGetters, extraArgsGetter]) => {
        const callWithIds = (...ids) => {
          var _a, _b;
          const index = size(ids);
          if (index == size(path)) {
            listener(thing, ...ids, ...extraArgsGetter(ids));
          } else if (isUndefined(path[index])) {
            arrayForEach(
              (_b =
                (_a = pathGetters[index]) == null
                  ? void 0
                  : _a.call(pathGetters, ...ids)) != null
                ? _b
                : [],
              (id2) => callWithIds(...ids, id2),
            );
          } else {
            callWithIds(...ids, path[index]);
          }
        };
        callWithIds();
      },
    );
  return [addListener, callListeners, delListener, callListener];
};

var __defProp$1 = Object.defineProperty;
var __getOwnPropSymbols$1 = Object.getOwnPropertySymbols;
var __hasOwnProp$1 = Object.prototype.hasOwnProperty;
var __propIsEnum$1 = Object.prototype.propertyIsEnumerable;
var __defNormalProp$1 = (obj, key, value) =>
  key in obj
    ? __defProp$1(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value,
      })
    : (obj[key] = value);
var __spreadValues$1 = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp$1.call(b, prop)) __defNormalProp$1(a, prop, b[prop]);
  if (__getOwnPropSymbols$1)
    for (var prop of __getOwnPropSymbols$1(b)) {
      if (__propIsEnum$1.call(b, prop)) __defNormalProp$1(a, prop, b[prop]);
    }
  return a;
};
var __async$1 = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) =>
      x.done
        ? resolve(x.value)
        : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
const scheduleRunning = mapNew();
const scheduleActions = mapNew();
const getStoreFunctions = (
  persist = 1 /* StoreOnly */,
  store,
  isSynchronizer,
) =>
  persist != 1 /* StoreOnly */ && store.isMergeable()
    ? [
        1,
        store.getMergeableContent,
        () => store.getTransactionMergeableChanges(!isSynchronizer),
        ([[changedTables], [changedValues]]) =>
          !objIsEmpty(changedTables) || !objIsEmpty(changedValues),
        store.setDefaultContent,
      ]
    : persist != 2 /* MergeableStoreOnly */
      ? [
          0,
          store.getContent,
          store.getTransactionChanges,
          ([changedTables, changedValues]) =>
            !objIsEmpty(changedTables) || !objIsEmpty(changedValues),
          store.setContent,
        ]
      : errorNew('Store type not supported by this Persister');
const createCustomPersister = (
  store,
  getPersisted,
  setPersisted,
  addPersisterListener,
  delPersisterListener,
  onIgnoredError,
  persist,
  extra = {},
  isSynchronizer = 0,
  scheduleId = [],
) => {
  let status = 0; /* Idle */
  let loads = 0;
  let saves = 0;
  let action;
  let autoLoadHandle;
  let autoSaveListenerId;
  mapEnsure(scheduleRunning, scheduleId, () => 0);
  mapEnsure(scheduleActions, scheduleId, () => []);
  const statusListeners = mapNew();
  const [
    isMergeableStore,
    getContent,
    getChanges,
    hasChanges,
    setDefaultContent,
  ] = getStoreFunctions(persist, store, isSynchronizer);
  const [addListener, callListeners, delListenerImpl] = getListenerFunctions(
    () => persister,
  );
  const setStatus = (newStatus) => {
    if (newStatus != status) {
      status = newStatus;
      callListeners(statusListeners, void 0, status);
    }
  };
  const run = () =>
    __async$1(void 0, null, function* () {
      /* istanbul ignore else */
      if (!mapGet(scheduleRunning, scheduleId)) {
        mapSet(scheduleRunning, scheduleId, 1);
        while (
          !isUndefined(
            (action = arrayShift(mapGet(scheduleActions, scheduleId))),
          )
        ) {
          try {
            yield action();
          } catch (error) {
            /* istanbul ignore next */
            onIgnoredError == null ? void 0 : onIgnoredError(error);
          }
        }
        mapSet(scheduleRunning, scheduleId, 0);
      }
    });
  const setContentOrChanges = (contentOrChanges) => {
    (isMergeableStore &&
      isArray(contentOrChanges == null ? void 0 : contentOrChanges[0])
      ? (contentOrChanges == null ? void 0 : contentOrChanges[2]) === 1
        ? store.applyMergeableChanges
        : store.setMergeableContent
      : (contentOrChanges == null ? void 0 : contentOrChanges[2]) === 1
        ? store.applyChanges
        : store.setContent)(contentOrChanges);
  };
  const load = (initialContent) =>
    __async$1(void 0, null, function* () {
      /* istanbul ignore else */
      if (status != 2 /* Saving */) {
        setStatus(1 /* Loading */);
        loads++;
        yield schedule(() =>
          __async$1(void 0, null, function* () {
            try {
              const content = yield getPersisted();
              if (isArray(content)) {
                setContentOrChanges(content);
              } else if (initialContent) {
                setDefaultContent(initialContent);
              } else {
                errorNew(`Content is not an array: ${content}`);
              }
            } catch (error) {
              onIgnoredError == null ? void 0 : onIgnoredError(error);
              if (initialContent) {
                setDefaultContent(initialContent);
              }
            }
            setStatus(0 /* Idle */);
          }),
        );
      }
      return persister;
    });
  const startAutoLoad = (initialContent) =>
    __async$1(void 0, null, function* () {
      stopAutoLoad();
      yield load(initialContent);
      try {
        autoLoadHandle = yield addPersisterListener((content, changes) =>
          __async$1(void 0, null, function* () {
            if (changes || content) {
              /* istanbul ignore else */
              if (status != 2 /* Saving */) {
                setStatus(1 /* Loading */);
                loads++;
                setContentOrChanges(changes != null ? changes : content);
                setStatus(0 /* Idle */);
              }
            } else {
              yield load();
            }
          }),
        );
      } catch (error) {
        /* istanbul ignore next */
        onIgnoredError == null ? void 0 : onIgnoredError(error);
      }
      return persister;
    });
  const stopAutoLoad = () => {
    if (autoLoadHandle) {
      delPersisterListener(autoLoadHandle);
      autoLoadHandle = void 0;
    }
    return persister;
  };
  const isAutoLoading = () => !isUndefined(autoLoadHandle);
  const save = (changes) =>
    __async$1(void 0, null, function* () {
      /* istanbul ignore else */
      if (status != 1 /* Loading */) {
        setStatus(2 /* Saving */);
        saves++;
        yield schedule(() =>
          __async$1(void 0, null, function* () {
            try {
              yield setPersisted(getContent, changes);
            } catch (error) {
              /* istanbul ignore next */
              onIgnoredError == null ? void 0 : onIgnoredError(error);
            }
            setStatus(0 /* Idle */);
          }),
        );
      }
      return persister;
    });
  const startAutoSave = () =>
    __async$1(void 0, null, function* () {
      stopAutoSave();
      yield save();
      autoSaveListenerId = store.addDidFinishTransactionListener(() => {
        const changes = getChanges();
        if (hasChanges(changes)) {
          save(changes);
        }
      });
      return persister;
    });
  const stopAutoSave = () => {
    if (autoSaveListenerId) {
      store.delListener(autoSaveListenerId);
      autoSaveListenerId = void 0;
    }
    return persister;
  };
  const isAutoSaving = () => !isUndefined(autoSaveListenerId);
  const getStatus = () => status;
  const addStatusListener = (listener) =>
    addListener(listener, statusListeners);
  const delListener = (listenerId) => {
    delListenerImpl(listenerId);
    return store;
  };
  const schedule = (...actions) =>
    __async$1(void 0, null, function* () {
      arrayPush(mapGet(scheduleActions, scheduleId), ...actions);
      yield run();
      return persister;
    });
  const getStore = () => store;
  const destroy = () => {
    arrayClear(mapGet(scheduleActions, scheduleId));
    return stopAutoLoad().stopAutoSave();
  };
  const getStats = () => ({loads, saves});
  const persister = __spreadValues$1(
    {
      load,
      startAutoLoad,
      stopAutoLoad,
      isAutoLoading,
      save,
      startAutoSave,
      stopAutoSave,
      isAutoSaving,
      getStatus,
      addStatusListener,
      delListener,
      schedule,
      getStore,
      destroy,
      getStats,
    },
    extra,
  );
  return objFreeze(persister);
};

const MASK6 = 63;
const ENCODE = /* @__PURE__ */ strSplit(
  '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz',
);
const encode = (num) => ENCODE[num & MASK6];

const getRandomValues = GLOBAL.crypto
  ? (array) => GLOBAL.crypto.getRandomValues(array)
  : /* istanbul ignore next */
    (array) => arrayMap(array, () => mathFloor(math.random() * 256));
const getUniqueId = (length = 16) =>
  arrayReduce(
    getRandomValues(new Uint8Array(length)),
    (uniqueId, number) => uniqueId + encode(number),
    '',
  );

var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value,
      })
    : (obj[key] = value);
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) =>
      x.done
        ? resolve(x.value)
        : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
const Message = {
  Response: 0 /* Response */,
  GetContentHashes: 1 /* GetContentHashes */,
  ContentHashes: 2 /* ContentHashes */,
  ContentDiff: 3 /* ContentDiff */,
  GetTableDiff: 4 /* GetTableDiff */,
  GetRowDiff: 5 /* GetRowDiff */,
  GetCellDiff: 6 /* GetCellDiff */,
  GetValueDiff: 7 /* GetValueDiff */,
};
const createCustomSynchronizer = (
  store,
  send,
  registerReceive,
  destroyImpl,
  requestTimeoutSeconds,
  onSend,
  onReceive,
  onIgnoredError,
  extra = {},
) => {
  let syncing = 0;
  let persisterListener;
  let sends = 0;
  let receives = 0;
  const pendingRequests = mapNew();
  const getTransactionId = () => getUniqueId(11);
  const sendImpl = (toClientId, requestId, message, body) => {
    sends++;
    onSend == null ? void 0 : onSend(toClientId, requestId, message, body);
    send(toClientId, requestId, message, body);
  };
  const request = (toClientId, message, body, transactionId) =>
    __async(void 0, null, function* () {
      return promiseNew((resolve, reject) => {
        const requestId = transactionId + '.' + getUniqueId(4);
        const timeout = startTimeout(() => {
          collDel(pendingRequests, requestId);
          reject(
            `No response from ${toClientId != null ? toClientId : 'anyone'} to ${requestId}, ` +
              message,
          );
        }, requestTimeoutSeconds);
        mapSet(pendingRequests, requestId, [
          toClientId,
          (response, fromClientId) => {
            clearTimeout(timeout);
            collDel(pendingRequests, requestId);
            resolve([response, fromClientId, transactionId]);
          },
        ]);
        sendImpl(toClientId, requestId, message, body);
      });
    });
  const mergeTablesStamps = (tablesStamp, [tableStamps2, tablesTime2]) => {
    objForEach(tableStamps2, ([rowStamps2, tableTime2], tableId) => {
      const tableStamp = objEnsure(tablesStamp[0], tableId, stampNewObj);
      objForEach(rowStamps2, ([cellStamps2, rowTime2], rowId) => {
        const rowStamp = objEnsure(tableStamp[0], rowId, stampNewObj);
        objForEach(
          cellStamps2,
          ([cell2, cellTime2], cellId) =>
            (rowStamp[0][cellId] = stampNew(cell2, cellTime2)),
        );
        rowStamp[1] = getLatestTime(rowStamp[1], rowTime2);
      });
      tableStamp[1] = getLatestTime(tableStamp[1], tableTime2);
    });
    tablesStamp[1] = getLatestTime(tablesStamp[1], tablesTime2);
  };
  const getChangesFromOtherStore = (..._0) =>
    __async(
      void 0,
      [..._0],
      function* (
        otherClientId = null,
        otherContentHashes,
        transactionId = getTransactionId(),
      ) {
        try {
          if (isUndefined(otherContentHashes)) {
            [otherContentHashes, otherClientId, transactionId] = yield request(
              null,
              1 /* GetContentHashes */,
              EMPTY_STRING,
              transactionId,
            );
          }
          const [otherTablesHash, otherValuesHash] = otherContentHashes;
          const [tablesHash, valuesHash] = store.getMergeableContentHashes();
          let tablesChanges = stampNewObj();
          if (tablesHash != otherTablesHash) {
            const [newTables, differentTableHashes] = (yield request(
              otherClientId,
              4 /* GetTableDiff */,
              store.getMergeableTableHashes(),
              transactionId,
            ))[0];
            tablesChanges = newTables;
            if (!objIsEmpty(differentTableHashes)) {
              const [newRows, differentRowHashes] = (yield request(
                otherClientId,
                5 /* GetRowDiff */,
                store.getMergeableRowHashes(differentTableHashes),
                transactionId,
              ))[0];
              mergeTablesStamps(tablesChanges, newRows);
              if (!objIsEmpty(differentRowHashes)) {
                const newCells = (yield request(
                  otherClientId,
                  6 /* GetCellDiff */,
                  store.getMergeableCellHashes(differentRowHashes),
                  transactionId,
                ))[0];
                mergeTablesStamps(tablesChanges, newCells);
              }
            }
          }
          return [
            tablesChanges,
            valuesHash == otherValuesHash
              ? stampNewObj()
              : (yield request(
                  otherClientId,
                  7 /* GetValueDiff */,
                  store.getMergeableValueHashes(),
                  transactionId,
                ))[0],
            1,
          ];
        } catch (error) {
          onIgnoredError == null ? void 0 : onIgnoredError(error);
        }
      },
    );
  const getPersisted = () =>
    __async(void 0, null, function* () {
      const changes = yield getChangesFromOtherStore();
      return changes &&
        (!objIsEmpty(changes[0][0]) || !objIsEmpty(changes[1][0]))
        ? changes
        : void 0;
    });
  const setPersisted = (_getContent, changes) =>
    __async(void 0, null, function* () {
      return changes
        ? sendImpl(null, getTransactionId(), 3 /* ContentDiff */, changes)
        : sendImpl(
            null,
            getTransactionId(),
            2 /* ContentHashes */,
            store.getMergeableContentHashes(),
          );
    });
  const addPersisterListener = (listener) => (persisterListener = listener);
  const delPersisterListener = () => (persisterListener = void 0);
  const startSync = (initialContent) =>
    __async(void 0, null, function* () {
      syncing = 1;
      return yield (yield persister.startAutoLoad(
        initialContent,
      )).startAutoSave();
    });
  const stopSync = () => {
    syncing = 0;
    return persister.stopAutoLoad().stopAutoSave();
  };
  const destroy = () => {
    destroyImpl();
    return persister.stopSync();
  };
  const getSynchronizerStats = () => ({sends, receives});
  const persister = createCustomPersister(
    store,
    getPersisted,
    setPersisted,
    addPersisterListener,
    delPersisterListener,
    onIgnoredError,
    2,
    // MergeableStoreOnly
    __spreadValues({startSync, stopSync, destroy, getSynchronizerStats}, extra),
    1,
  );
  registerReceive((fromClientId, transactionOrRequestId, message, body) => {
    const isAutoLoading = syncing || persister.isAutoLoading();
    receives++;
    onReceive == null
      ? void 0
      : onReceive(fromClientId, transactionOrRequestId, message, body);
    if (message == 0 /* Response */) {
      ifNotUndefined(
        mapGet(pendingRequests, transactionOrRequestId),
        ([toClientId, handleResponse]) =>
          isUndefined(toClientId) || toClientId == fromClientId
            ? handleResponse(body, fromClientId)
            : /* istanbul ignore next */
              0,
      );
    } else if (message == 2 /* ContentHashes */ && isAutoLoading) {
      getChangesFromOtherStore(
        fromClientId,
        body,
        transactionOrRequestId != null ? transactionOrRequestId : void 0,
      )
        .then((changes) => {
          persisterListener == null
            ? void 0
            : persisterListener(void 0, changes);
        })
        .catch(onIgnoredError);
    } else if (message == 3 /* ContentDiff */ && isAutoLoading) {
      persisterListener == null ? void 0 : persisterListener(void 0, body);
    } else {
      ifNotUndefined(
        message == 1 /* GetContentHashes */ &&
          (syncing || persister.isAutoSaving())
          ? store.getMergeableContentHashes()
          : message == 4 /* GetTableDiff */
            ? store.getMergeableTableDiff(body)
            : message == 5 /* GetRowDiff */
              ? store.getMergeableRowDiff(body)
              : message == 6 /* GetCellDiff */
                ? store.getMergeableCellDiff(body)
                : message == 7 /* GetValueDiff */
                  ? store.getMergeableValueDiff(body)
                  : void 0,
        (response) => {
          sendImpl(
            fromClientId,
            transactionOrRequestId,
            0 /* Response */,
            response,
          );
        },
      );
    }
  });
  return persister;
};

exports.Message = Message;
exports.createCustomSynchronizer = createCustomSynchronizer;
