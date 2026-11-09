// Reusable entity lists. Removal is order-independent (swap with last) so the
// simulation loops stay allocation free in the common case.
export class EntityList {
  constructor(factory, initial = 0) {
    this.factory = factory;
    this.active = [];
    this.pool = [];
    for (let i = 0; i < initial; i++) this.pool.push(factory());
  }

  spawn() {
    const e = this.pool.pop() || this.factory();
    e.dead = false;
    this.active.push(e);
    return e;
  }

  releaseAt(i) {
    const a = this.active;
    const e = a[i];
    const last = a.pop();
    if (i < a.length) a[i] = last;
    e.dead = true;
    this.pool.push(e);
    return e;
  }

  clear() {
    const a = this.active;
    for (let i = 0; i < a.length; i++) {
      a[i].dead = true;
      this.pool.push(a[i]);
    }
    a.length = 0;
  }

  get count() {
    return this.active.length;
  }
}
