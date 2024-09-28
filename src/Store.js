/** @license ISC License (c) copyright 2023 */
/** @author Moorthy RS (rsmoorthy@gmail.com)  */

import { Box } from "./Box.js"
// import all from crocks
import { default as crocks } from "crocks"
import { default as _inspect } from "crocks/core/inspect.js"
const { isFunction, isObject, curry } = crocks

var _of = function (u) {
  return Store(isObject(u) ? u : {})
}
export function Store(u) {
  var of = _of

  var obj = isObject(u) ? u : {}

  var inspect = () => {
    return "Store" + _inspect(obj)
  }

  // get :: a -> () -> b
  // eslint-disable-next-line no-unused-vars
  const get = curry((key, _) => {
    if (key in obj) return obj[key]
    return undefined
  })

  // set :: a -> b -> b
  const set = curry((key, val) => {
    obj[key] = val
    return val
  })

  // modify :: a -> (b -> c) -> c
  const modify = curry((key, fn) => {
    if (!isFunction(fn)) throw new Error("Store.modify: Should receive a fucntion")

    let v = fn(get(key)())
    return set(key)(v)
  })

  // keyf :: (a, {k: (o, ...)) -> Store ~> { get: (() -> a), set: (a -> keyf), modify: (b -> b), [k]: (keyf....) }
  const keyf = (key, fns) => {
    let o = {
      /*
      fn: (f, ...fargs) => {
        let v = get(key)()
        if (isObject(v) && isFunction(v[f])) return (...args) => v[f](o, ...fargs, ...args)
        else throw new Error("Store.fn: Should have stored a Object and function via set before")
      },
      */
      get: () => get(key)(),
      set: (x) => {
        set(key, x)
        return o
      },
      modify: (fn) => {
        modify(key, fn)
        return o
      },
    }
    if (!fns) return o
    Object.keys(fns).forEach((k) => {
      if (!isFunction(fns[k]))
        throw new Error("Store.keyf: The second argument should contain a object of keys and functions")
      o[k] = (...args) => fns[k](o, ...args)
    })
    return o
  }

  return {
    of,
    get,
    set,
    modify,
    keyf,
    inspect,
    constructor: Store,
  }
}

Store.of = _of

// cache :: a -> Store ~> get/set
export const Cache = (expireAfter = 3000) => {
  var { get, set } = Store({})
  var key = "key"
  const expireKeys = () => {
    let val = get(key)()
    Object.keys(val).forEach((k) => {
      if (val[k]?.setTime && Date.now() - val[k].setTime > expireAfter) delete val[k]
    })
    set(key, val)
  }
  const cacheSet = (key, k, x) => {
    setTimeout(() => expireKeys(), 1)
    let val = get(key)()
    set(key, { ...val, [k]: { value: x, setTime: Date.now() } })
    return x
  }
  const cacheGet = (key, k) => {
    setTimeout(() => expireKeys(), 1)
    let val = get(key)()
    if (!isObject(val)) throw new Error("Store.cache: the value set is not an object, unexplained")
    if (!isObject(val[k]) || (val[k]?.setTime && Date.now() - val[k].setTime > expireAfter)) {
      if (isFunction(get("getFn")()[k])) {
        let v = get("getFn")()[k]()
        if (Box.isBox(v)) {
          // Lot of assumption here, that the box is not run and will eventually be run
          v = v.map((x) => {
            cacheSet(key, k, x)
            return x
          })
        } else cacheSet(key, k, v)
        return v
      }
      return undefined
    } else return val[k].value
  }
  let o = {
    get: (k) => cacheGet(key, k),
    set: (k, x) => {
      cacheSet(key, k, x)
      return o
    },
    getFn: (k, fn) => {
      set("getFn", { ...get("getFn"), [k]: () => fn(k) })
      return o
    },
  }
  set(key, {})
  set("getFn", {})
  return o
}

export const gStore = Store()
export const gCache = Cache()
