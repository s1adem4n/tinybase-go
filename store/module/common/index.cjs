'use strict';

const EMPTY_STRING = '';
const strSplit = (str, separator = EMPTY_STRING, limit) =>
  str.split(separator, limit);

const GLOBAL = globalThis;
const math = Math;
const mathFloor = math.floor;

const arrayMap = (array, cb) => array.map(cb);
const arrayReduce = (array, cb, initial) => array.reduce(cb, initial);

const MASK6 = 63;
const ENCODE = /* @__PURE__ */ strSplit(
  '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz',
);
const encode = (num) => ENCODE[num & MASK6];

const getRandomValues = GLOBAL.crypto
  ? (array) => GLOBAL.crypto.getRandomValues(array)
  : /* istanbul ignore next */
    (array) => arrayMap(array, () => mathFloor(math.random() * 256));
const defaultSorter = (sortKey1, sortKey2) =>
  (sortKey1 != null ? sortKey1 : 0) < (sortKey2 != null ? sortKey2 : 0)
    ? -1
    : 1;
const getUniqueId = (length = 16) =>
  arrayReduce(
    getRandomValues(new Uint8Array(length)),
    (uniqueId, number) => uniqueId + encode(number),
    '',
  );

exports.defaultSorter = defaultSorter;
exports.getUniqueId = getUniqueId;
