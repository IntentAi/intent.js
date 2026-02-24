/**
 * A Map subclass with extra utility methods — mirrors the discord.js Collection API
 * so bots ported from discord.js feel at home.
 */
export class Collection<K, V> extends Map<K, V> {
  filter(fn: (value: V, key: K) => boolean): Collection<K, V> {
    const result = new Collection<K, V>();
    for (const [k, v] of this) {
      if (fn(v, k)) result.set(k, v);
    }
    return result;
  }

  find(fn: (value: V, key: K) => boolean): V | undefined {
    for (const [k, v] of this) {
      if (fn(v, k)) return v;
    }
    return undefined;
  }

  map<T>(fn: (value: V, key: K) => T): T[] {
    const result: T[] = [];
    for (const [k, v] of this) {
      result.push(fn(v, k));
    }
    return result;
  }

  first(): V | undefined {
    return this.values().next().value;
  }

  last(): V | undefined {
    let last: V | undefined;
    for (const v of this.values()) last = v;
    return last;
  }

  random(): V | undefined {
    const arr = [...this.values()];
    if (!arr.length) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  toJSON(): V[] {
    return [...this.values()];
  }
}
