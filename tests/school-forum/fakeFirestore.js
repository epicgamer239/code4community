/**
 * Minimal in-memory stand-in for the Admin Firestore API surface forumServer.js uses:
 * collection/doc/where(==)/get/set(merge)/update/delete, batch(), runTransaction().
 * Transactions enforce Firestore's "all reads before writes" rule so ordering bugs show up in tests.
 */
let autoId = 0;

const clone = (value) => structuredClone(value);

class DocSnap {
  constructor(ref, data) {
    this.ref = ref;
    this.id = ref.id;
    this.exists = data !== undefined;
    this._data = data;
  }
  data() {
    return this._data === undefined ? undefined : clone(this._data);
  }
}

class DocRef {
  constructor(db, collection, id) {
    this._db = db;
    this.collection = collection;
    this.id = id;
    this.path = `${collection}/${id}`;
  }
  async get() {
    return new DocSnap(this, this._db._read(this.collection, this.id));
  }
  async set(data, options) {
    this._db._set(this.collection, this.id, data, options);
  }
  async update(data) {
    this._db._update(this.collection, this.id, data);
  }
  async delete() {
    this._db._delete(this.collection, this.id);
  }
}

class Query {
  constructor(db, collection, filters = [], max = Infinity) {
    this._db = db;
    this._collection = collection;
    this._filters = filters;
    this._max = max;
  }
  where(field, op, value) {
    if (op !== "==") throw new Error(`fakeFirestore only supports == (got ${op})`);
    return new Query(this._db, this._collection, [...this._filters, [field, value]], this._max);
  }
  limit(n) {
    return new Query(this._db, this._collection, this._filters, n);
  }
  async get() {
    const docs = [];
    for (const [id, data] of this._db._collection(this._collection)) {
      if (this._filters.every(([f, v]) => data[f] === v)) {
        docs.push(new DocSnap(new DocRef(this._db, this._collection, id), clone(data)));
      }
      if (docs.length >= this._max) break;
    }
    return { docs, empty: docs.length === 0, size: docs.length };
  }
}

class CollectionRef extends Query {
  doc(id) {
    return new DocRef(this._db, this._collection, id ?? `auto${++autoId}`);
  }
}

class WriteBatch {
  constructor(db) {
    this._db = db;
    this._ops = [];
  }
  set(ref, data, options) {
    this._ops.push(() => this._db._set(ref.collection, ref.id, data, options));
    return this;
  }
  update(ref, data) {
    this._ops.push(() => this._db._update(ref.collection, ref.id, data));
    return this;
  }
  delete(ref) {
    this._ops.push(() => this._db._delete(ref.collection, ref.id));
    return this;
  }
  async commit() {
    this._ops.forEach((op) => op());
  }
}

class Transaction extends WriteBatch {
  async get(refOrQuery) {
    if (this._ops.length) throw new Error("Firestore transactions require all reads before writes.");
    return refOrQuery.get();
  }
}

export class FakeFirestore {
  constructor() {
    /** @type {Map<string, Map<string, object>>} */
    this._store = new Map();
    this.projectId = "fake-project";
  }
  _collection(name) {
    if (!this._store.has(name)) this._store.set(name, new Map());
    return this._store.get(name);
  }
  _read(collection, id) {
    const data = this._collection(collection).get(id);
    return data === undefined ? undefined : clone(data);
  }
  _set(collection, id, data, options) {
    const prev = this._collection(collection).get(id);
    const next = options?.merge && prev ? { ...prev, ...clone(data) } : clone(data);
    this._collection(collection).set(id, next);
  }
  _update(collection, id, data) {
    const prev = this._collection(collection).get(id);
    if (!prev) throw new Error(`No document to update: ${collection}/${id}`);
    this._collection(collection).set(id, { ...prev, ...clone(data) });
  }
  _delete(collection, id) {
    this._collection(collection).delete(id);
  }
  collection(name) {
    return new CollectionRef(this, name);
  }
  batch() {
    return new WriteBatch(this);
  }
  async runTransaction(fn) {
    const tx = new Transaction(this);
    const result = await fn(tx);
    await tx.commit();
    return result;
  }
  /** Test helper: load `{ collection, id, data }[]` docs. */
  load(docs) {
    for (const { collection, id, data } of docs) this._set(collection, id, data);
    return this;
  }
  /** Test helper: every document, for leak scans. */
  all(collection) {
    return [...this._collection(collection).entries()].map(([id, data]) => ({ id, ...clone(data) }));
  }
}
