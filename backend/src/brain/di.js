export class DIContainer {
  constructor() {
    this._registry = new Map();
    this._instances = new Map();
  }

  register(name, ClassOrInstance, options = {}) {
    this._registry.set(name, { ClassOrInstance, singleton: options.singleton !== false });
    return this;
  }

  resolve(name) {
    if (this._instances.has(name)) return this._instances.get(name);
    const entry = this._registry.get(name);
    if (!entry) return null;
    if (entry.singleton) {
      const instance = typeof entry.ClassOrInstance === 'function'
        ? new entry.ClassOrInstance(this)
        : entry.ClassOrInstance;
      this._instances.set(name, instance);
      return instance;
    }
    return typeof entry.ClassOrInstance === 'function'
      ? new entry.ClassOrInstance(this)
      : entry.ClassOrInstance;
  }

  has(name) {
    return this._registry.has(name);
  }

  getAllNames() {
    return Array.from(this._registry.keys());
  }
}
