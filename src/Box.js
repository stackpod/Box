/** @license GNU Public License V3 (c) copyright 2024 */
/** @author Moorthy RS (rsm@stackpod.io)  */

/* Interface:
 *  Box(fn, [u]) or Box(u)
 *
 *    fn => Args (resolve, state)
 *        resolve => In Pair( result, state) => Out Pair(result, state)
 *    of, map, chain, bimap, bichain, getState, alt
 *
 *
 */

// import all from crocks
import { default as crocks } from "crocks"
// import { default as _inspect } from "crocks/core/inspect.js"
import { inspect as _inspect } from "./inspect.js"
const {
  Pair,
  Maybe,
  branch,
  isFunction,
  isObject,
  isArray,
  compose,
  compose2,
  pipe,
  converge,
  binary,
  unary,
  unit,
  bimap,
  identity,
  fst,
  snd,
  isPromise,
  isInteger,
  isNumber,
  isSameType,
  once,
  curry,
  ifElse,
  when,
  unless,
  and,
  // flip,
} = crocks
import * as R from "ramda"

const type = () => "Box"

// import locally
import { defineUnion as _defineUnion } from "./union.js"
import { Store } from "./Store.js"

// this is same as compose2
// eslint-disable-next-line no-unused-vars
const converge2 = curry((f, g, h, x, y) => curry(f)(g(x), h(y)))

export const setPath = curry((path, fn) =>
  ifElse(
    R.hasPath(path), // if path exists
    R.modifyPath(path, fn), // modifyPath
    R.assocPath(path, fn(undefined)) // else create it
  )
)

const symNoData = Symbol("no data")
const symErr = Symbol("Err")

var constant = (x) => {
  let f = () => x
  f.type = "_constant"
  return f
}
constant.type = () => "constant"

const throwError = (e) => () => {
  throw new TypeError(e)
}

// toArray :: a -> [a]
// eslint-disable-next-line no-unused-vars
const toArray = (x) => (isArray(x) ? x : [x])

// arrayToIndexedArray :: [a] -> [ [a, 0], .... [a, n] ]
const arrayToIndexedArray = (a) => (isArray(a) ? a.map((v, i) => [v, i]) : [[a, 0]])

// compose binary functions, where the first parameter is a function and second the value applied
// composeF(f, g, h, i, j) gives j(i(h(g(f)))) where each function takes another function
// as the first argument
// Each function should accept two arguments and it should be curried:
//    nextFn:  that should be called to pass control to the next function
//    x: incoming data, which is modified and passed to nextFn
// composeF :: (((b -> a) -> b), ...., ((z -> y) -> z)) -> ((z -> a) -> z)
const composeF = (...args) => {
  // Prepending function (binary(unit)) ends the composition
  args = [binary(unit), ...args] // , binary((next, x) => unit(next(x)))]
  const _composeF = (...args) =>
    args.length === 0
      ? throwError("args needed")()
      : args.length === 1
        ? args[args.length - 1]
        : args[args.length - 1](_composeF(...args.slice(0, args.length - 1)))
  return _composeF(...args)
}

// pipe binary functions, where the first parameter is a function and second the value applied
// pipeF(f, g, h, i, j) gives f(g(h(i(j)))) where each function takes another function
// as the first argument (sort of callback function, but present in the first argument)
// pipeF :: (((a -> b) -> a), ...., ((y -> z) -> y)) -> ((a -> z) -> a)
const pipeF = (...args) => composeF(...args.reverse())

// compose functions that are present in an array, rather than as arguments
// composeA :: [(x -> y) ... (a -> b)] -> (a -> y)
const composeA = (args) => compose(...args)

// pipeA :: [(a -> b) ... (x -> y)] -> (a -> y)
// eslint-disable-next-line no-unused-vars
const pipeA = (args) => pipe(...args)

const isFnType = (type, f) => isFunction(f) && f.type === type

const isBox = (box) => isObject(box) && isFunction(box.type) && box.type() === "Box"
const inBoxMode = (box) => box.extract() !== symNoData
const isCancelled = (box) => isBox(box) && box.exp?.abortController.signal.aborted

var result = _defineUnion({ Err: ["a"], Ok: ["b"] })

const log = (str) => (x) => {
  Box.debug ? console.log(`log -> ${str}`, _inspect(x)) : ""
  return x
}

// eslint-disable-next-line no-unused-vars
const log2 = (str, fn) => (x) => {
  let y = fn(x)
  Box.debug ? console.log(`log2 -> ${str} Start`, _inspect(x), `End `, _inspect(y)) : ""
  return y
}

// logF -> str -> (a -> a) -> a -> a
const logF = curry((str, next, x) => {
  Box.debug ? console.log(`logF -> ${str}`, _inspect(x)) : ""
  return next(x)
})

// eslint-disable-next-line no-unused-vars
function wrapUnit(inp) {
  let f = isFunction(inp) ? inp : unit
  return f()
}

// isResult :: result e o -> bool
const isResult = (r) => {
  return result.includes(r) && isFunction(r.tag) && (isFunction(r.a?.value) || isFunction(r.b?.value))
}

// isResultOk :: result e o -> bool
const isResultOk = ifElse(isResult, (r) => r.tag() === "Ok", constant(false))
// isResultErr :: result e o -> bool
const isResultErr = ifElse(isResult, (r) => r.tag() === "Err", constant(false))

// updateValueResult :: result e o -> a -> result e o
const updateValueResult = (r, v) => {
  if (!isResult(r)) throw new TypeError("Box.updateResult: Argument must be a result type")

  if (r.tag() == "Ok") return result.Ok(v)
  else return result.Err(v)
}

// resultToBox :: result e o -> s -> Box r s
const resultToBox = compose2((r, s) => Box(r, s), unless(isResult, throwError("resultToBox: Result needed")), identity)
// resultToPair :: result e o -> s -> Pair r s
const resultToPair = compose2(Pair, unless(isResult, throwError("resultToPair: Result needed")), identity)
// resultToValue :: result e o -> o
const resultToValue = unary(
  compose((r) => (r.a ? r.a.value() : r.b.value()), unless(isResult, throwError("resultToValue: Result needed")))
)

// getState :: (s -> s) -> Box s s
function getState(fn) {
  if (!isFunction(fn)) fn = identity
  return Box((resolve, s) => resolve(Pair(result.Ok(fn(s)), s)))
}

// modifyState :: (s -> s) -> a -> Box a s
function modifyState(fn, x) {
  if (!isFunction(fn)) throw new TypeError("Box.modifyState: Function Required")
  return Box((resolve, s) => resolve(Pair(result.Ok(x), fn(s))))
}

// Box.fromPromise :: (* -> Promise a e) -> (* => Box r s)
function fromPromise(fn) {
  if (!isFunction(fn)) throw new Error("Box.fromPromise: Promise returning function required")

  const _fn = curry(fn)

  return function () {
    var args = arguments

    const promise = _fn.apply(null, args)

    if (isFunction(promise)) return fromPromise(promise)

    return Box((resolve, state) => {
      if (!isPromise(promise)) throw new Error("Box.fromPromise: Promise returning function required")
      promise.then(
        (x) => resolve(Pair(result.Ok(x), state)),
        (e) => resolve(Pair(result.Err(e), state))
      )
    })
  }
}

// Calls the function returning promise only after Box is run
// and hence fn cannot be curried
// Box.fromPromiseLazy :: (* -> Promise a e) -> (* => Box r s)
function fromPromiseLazy(fn) {
  if (!isFunction(fn)) throw new Error("Box.fromPromiseLazy: Promise returning function required")

  return function () {
    var args = arguments

    return Box((resolve, state) => {
      const promise = fn.apply(null, args)

      if (!isPromise(promise)) throw new Error("Box.fromPromiseLazy: promise returning function required")
      promise.then(
        (x) => resolve(Pair(result.Ok(x), state)),
        (e) => resolve(Pair(result.Err(e), state))
      )
    })
  }
}

// Box.rejectAfter :: (Integer, value) -> Box r s
const rejectAfter = (ms, value) => {
  if (!(isInteger(ms) && ms >= 0)) throw new TypeError("Box.rejectAfter: First argument must be a positive Integer")

  return Box((resolve, state) => {
    const token = setTimeout(() => {
      resolve(Pair(result.Err(value), state))
    }, ms)

    return () => {
      clearTimeout(token)
    }
  })
}

// Box.resolveAfter :: (Integer, value) -> Box r s
const resolveAfter = (ms, value) => {
  if (!(isInteger(ms) && ms >= 0)) throw new TypeError("Box.resolveAfter: First argument must be a positive Integer")

  return Box((resolve, state) => {
    const token = setTimeout(() => {
      resolve(Pair(result.Ok(value), state))
    }, ms)

    return () => {
      clearTimeout(token)
    }
  })
}

// Box.waitUntil :: (Integer, Integer, (a) -> Boolean | Box r s) -> a -> Box r s
const waitUntil = curry((timeout, interval, fn, a) => {
  if (!isNumber(timeout) || !isNumber(interval))
    throw new TypeError("Box.waitUntil: First two arguments must be a number")
  if (!isFunction(fn)) throw new TypeError("Box.waitUntil: Third argument must be a function")
  const cfn = (x) =>
    Box(x)
      .chain(Box.delay(interval))
      .chain((x) => {
        let o = fn(x)
        return isBox(o) // If it is a Box
          ? o.chain((y) => (y ? Box(x) : cfn(x))) // then check its truthy inside
          : o // check if it is truthy
            ? Box(x) // if yes, end the ordeal
            : cfn(x) // else loop
      })
  return Box(a).chain(cfn).race(Box.rejectAfter(timeout, "Box.waitUntil: Timed out"))
})

/*
const resolvePromise2 = (resolve) => (pair) => {
  if (!isSameType(Pair, pair)) throw new TypeError("Box.resolvePromise: Argument must be a Pair")
  let promise = resultToValue(pair.fst())
  let state = pair.snd()
  if (!isPromise(promise)) {
    resolve(pair)
  } else {
    promise.then(
      (x) => resolve(Pair(result.Ok(x), state)),
      (e) => resolve(Pair(result.Err(e), state))
    )
  }
}
*/

// resolvePromise :: (result e o -> ()) -> a -> ()
const resolvePromise = (abortController, resolve) => (promise) => {
  if (!isPromise(promise)) return resolve(isResult(promise) ? promise : result.Ok(promise))

  let called = false
  let abortListener
  const onceResolve = (x) => {
    if (called === false) {
      if (abortController) abortController.signal.removeEventListener("abort", abortListener)
      called = true
      resolve(x)
    }
  }

  if (abortController) {
    abortListener = ({ target }) => {
      abortController.signal.removeEventListener("abort", abortListener)
      called = true
      // onceResolve(result.Err(target.reason))  No need to call this, as it is already cancelled
    }
    abortController.signal.addEventListener("abort", abortListener)
  }

  promise.then(
    (x) => onceResolve(result.Ok(x)),
    (e) => onceResolve(result.Err(e))
  )
}

// _either :: (a -> b) -> (a -> b) -> result e o -> result e o
const _either = (f, g) => {
  if (!isFunction(f) || !isFunction(g)) {
    throw new TypeError("Box.either: Requires both functions")
  }

  return (a) => result.caseOf({ Err: f, Ok: g }, a)
}

// eitherOk :: (a -> b) -> result e o -> result e o
// eslint-disable-next-line no-unused-vars
const eitherOk = (f) => {
  return _either(result.Err, compose(ifElse(isResult, identity, result.Ok), f))
}

// eitherErr :: (a -> b) -> (result e o -> result e o)
// eslint-disable-next-line no-unused-vars
const eitherErr = (f) => {
  return _either(compose(ifElse(isResult, identity, result.Err), f), result.Ok)
}

// TODO - Right now, simply sending the latest
// concatAltErr :: result e o -> result e o -> result e o
const concatAltErr = (fst, snd) => result.Err(snd)

// Not used now
// eitherAlt2 :: Box r s -> result e o -> result e o
// eslint-disable-next-line no-unused-vars
const eitherAlt2 = (m) =>
  _either(
    (e) => m.either((me) => concatAltErr(e, me), result.Ok)(), // If Both are errors, concat them if applicable
    result.Ok // If I am not an error, Ignore the Alt
  )

// resultToArray :: result e o -> [e o]
const resultToArray = (u) => {
  let e = false
  let o = _either(
    compose((x) => {
      e = true
      return x
    }, identity),
    identity
  )(u)
  if (e) return [o, null]
  return [null, o]
}

// eslint-disable-next-line no-unused-vars
const unsafeFst = (a) => a[0]

const unsafeSnd = (a) => a[1]

// _of :: a -> s -> Box r s
var _of = function (x, st) {
  let u = result.includes(x) ? x : result.Ok(x)
  return Box(
    (resolve, state) => {
      resolve(Pair(u, state))
      return unit
    },
    u,
    st
  )
}

// pairToResult :: Pair r s -> result e o
const pairToResult = unary(compose(fst, unless(isSameType(Pair), throwError("pairToResult: Pair needed"))))
// pairToArray :: Pair r s -> [ e o ]
const pairToArray = unary(
  compose(resultToArray, pairToResult, unless(isSameType(Pair), throwError("pairToArray: Pair needed")))
)

// pairToArray :: Pair r s -> s
const pairToState = unary(compose(snd, unless(isSameType(Pair), throwError("pairToState: Pair needed"))))

// pairToValue :: Pair r s -> a
const pairToValue = unary(
  compose(unsafeSnd, resultToArray, fst, unless(isSameType(Pair), throwError("pairToValue: Pair needed")))
)

// startChain :: (a -> a) -> (a -> a) -> (result e o -> result e o) -> Pair r s -> result e o
const startChain = curry((storeResult, storeState, next) =>
  compose(
    unit,
    bimap(next, identity), // process next
    bimap(storeResult, storeState), // store state
    log("startChain")
  )
)

// resolvePromiseOk :: (a -> b) -> (result e o -> result e o) -> result e o -> result e o
const resolvePromiseOk = curry((abortController, mapFn, next) =>
  _either(
    compose(next, result.Err), // for error, just next
    compose(resolvePromise(abortController, next), mapFn) // for ok, resolve promise and then next
  )
)

// resolvePromiseErr :: (a -> b) -> (result e o -> result e o) -> result e o -> result e o
// eslint-disable-next-line no-unused-vars
const resolvePromiseErr = curry((abortController, mapFn, next) =>
  _either(
    compose(resolvePromise(abortController, next), mapFn), // for err, resolve promise and then next
    compose(next, result.Err) // for ok, just next
  )
)

// resultForceError :: result e o -> result e o
const resultForceError = _either(compose(result.Err), compose(result.Err))

// resolvePromiseEither :: (a -> b) -> (c -> d) -> (result e o -> result e o) -> result e o -> result e o
const resolvePromiseEither = curry((abortController, errFn, okFn, next) =>
  _either(
    compose(resolvePromise(abortController, compose(next, resultForceError)), errFn), // resolve for err
    compose(resolvePromise(abortController, next), okFn) // as well as for ok. One of them will get called
  )
)

// callAltFn :: ((a => Box r s) | Box r s) -> (result e o -> result e o) -> result e o -> result e o
const callAltFn = curry((abortController, altFn, next) =>
  _either(
    ifElse(
      () => isBox(altFn), // condition
      compose(next, () => result.Err(altFn)), // if
      compose(resolvePromise(abortController, compose(next, resultForceError)), (x) => (isFunction(altFn) ? altFn(x) : x)) // else
    ),
    compose(next, result.Ok)
  )
)

// callFnOrBox :: ((a => Box r s) | Box r s) -> (result e o -> result e o) -> result e o -> result e o
const callFnOrBox = curry((abortController, fn, next) =>
  _either(
    compose(next, result.Err),
    ifElse(
      () => isBox(fn), // condition
      compose(next, () => result.Ok(fn)), // if
      compose(resolvePromise(abortController, next), (x) => (isFunction(fn) ? fn(x) : x)) // else
    )
  )
)

// chainBoxToResult :: (a -> a) -> Box r s -> result e o
const chainBoxToResult = (setState) => compose(fst, bimap(identity, setState), Box.toPair)

// runBoxOk :: (a -> a) -> (a -> a) -> (() -> a) -> (result e o -> result e o) -> result e o -> result e o
const runBoxOk = curry((setCancel, setState, getState, next) =>
  _either(
    compose(next, result.Err), // Error part, just send it as is
    compose(
      (box) => setCancel(box.run(compose(next, chainBoxToResult(setState)), getState())),
      unless(isBox, throwError("Box.runbox: Need to return type Box"))
    )
  )
)

// runBoxErr :: (a -> a) -> (a -> a) -> (() -> a) -> (result e o -> result e o) -> result e o -> result e o
const runBoxErr = curry((setCancel, setState, getState, next) =>
  _either(
    compose(
      (box) => setCancel(box.run(compose(next, chainBoxToResult(setState)), getState())),
      unless(isBox, throwError("Box.runbox: Need to return type Box")),
      log("runBoxErr err")
    ),
    compose(next, result.Ok, log("runBoxErr ok")) // Ok part, just send it as is
  )
)

// runBoxEither :: (a -> a) -> (a -> a) -> (() -> a) -> (result e o -> result e o) -> result e o -> result e o
const runBoxEither = curry((setCancel, setState, getState, next) =>
  _either(
    compose(
      (box) => setCancel(box.run(compose(next, resultForceError, chainBoxToResult(setState)), getState())),
      unless(isBox, throwError("Box.runbox: Need to return type Box"))
    ),
    compose(
      (box) => setCancel(box.run(compose(next, chainBoxToResult(setState)), getState())),
      unless(isBox, throwError("Box.runbox: Need to return type Box"))
    )
  )
)

// handoffToResolve ::  (() -> a) -> (x -> ()) -> (() -> ()) -> ()
const handoffToResolve = curry((getState, resolve, next) =>
  compose(
    next,
    resolve, // final resolve
    (r) => resultToPair(r, getState()), // Compute Pair
    log("hoff")
  )
)

// eitherAlt :: (result e o | (() -> result e o)) -> (result e o -> result e o) -> result e o -> result e o
const eitherAlt = curry((origResult, next, altr) => {
  origResult = isFunction(origResult) ? origResult() : origResult
  return next(
    _either(
      (e) => _either((me) => concatAltErr(e, me), result.Ok)(altr), // orig err. Alt err and Alt ok casess
      result.Ok // orig ok
    )(origResult)
  )
})

// verifyAp :: (result e o -> result e o) -> result e o -> result e o
const verifyAp = curry((next) =>
  _either(
    compose(next, result.Err), // err
    ifElse(isFunction, compose(next, result.Ok), throwError("Ap parameter must be a function")) // ok
  )
)

// runApFunc :: (result e o | (() -> result e o)) -> (result e o -> result e o) -> result e o -> result e o
const runApFunc = curry((origResult, next, apResult) =>
  _either(
    compose(next, result.Err), // orig Err as is
    (fn) => {
      return _either(
        compose(next, result.Err), // Err
        compose(next, result.Ok, fn) // Run fn(x)
      )(apResult)
    }
  )(isFunction(origResult) ? origResult() : origResult)
)

// traverseResolve :: str -> Store v -> Store v -> int -> (result e o -> result e o) ->
//                      (result e o -> result e o) -> result e o
const traverseResolve = curry((method, cancels, results, index, end, next, r) => {
  return compose(
    when(() => method == "AllOk", ifElse(results.isAllProcessed, compose(end, results.mergeOk), next)),
    when(
      () => method == "AllSettled",
      ifElse(results.isAllProcessed, compose(end, log("all settled"), results.merge), next)
    ),
    when(
      () => method == "All",
      ifElse(isResultOk, ifElse(results.isAllProcessed, compose(end, results.merge), next), compose(cancels.merge, end))
    ),
    when(
      () => method == "Any",
      ifElse(
        isResultOk,
        compose(cancels.merge, end, log("tresolve Any isOk")),
        ifElse(
          results.isAllProcessed,
          compose(cancels.merge, end, () => result.Err("Box.traverseAny: All Errs")),
          next
        )
      )
    ),
    when(() => method == "Race", compose(cancels.merge, end)),
    results.append(index),
    log("trav resolve step 1")
  )(r)
})

// traverseRun :: (a -> Box r s) -> [b] -> c -> d -> (result e o -> result e o) -> result e [o] -> result e [o]
const traverseRun = curry((abortController, travFn, cancels, method, mode, handoff, inResult) => {
  if (!isResultOk(inResult)) return handoff(inResult)
  let queues = arrayToIndexedArray(resultToValue(inResult))
  let total = queues.length
  if (total === 0) return handoff(inResult)

  var { get, keyf } = Store()

  // setTimeout is called on next(), because next() immediately calls the function and if the 
  // function does not wait for anything, it completes before returning control to this function back
  let results = keyf("results", {
    isAllProcessed: (o) => Object.keys(o.get().results).length === o.get().total,
    takeOne: (o, next) =>
      o.modify((v) => {
        let a = v.queues.shift()
        if (isArray(a) && a.length === 2) next(a[1], a[0])
        return v
      }),
    takeN: (o, n, next) => {
      o.modify((v) => {
        let aa = v.queues.splice(0, n)
        aa.map((a) => isArray(a) && a.length === 2 && next(a[1], a[0]))
        return v
      })
    },
    takeAll: (o, next) => {
      o.modify((v) => {
        let aa = v.queues.splice(0)
        aa.map((a) => {
          isArray(a) && a.length === 2 && next(a[1], a[0])
        })
        return v
      })
    },
    queue: (o, i) => (r) => {
      o.modify((v) => {
        v.queues[i] = r
        return v
      })
    },
    append: (o, i) => (r) => {
      o.modify((v) => {
        v.results[i] = r
        return v
      })
      return r
    },
    merge: (o) => {
      let v = o.get()
      let vra = []
      for (let i = 0; i < Object.keys(v.results).length; i++) vra.push(v.results[i])
      let va = vra.map((a) => (isResultOk(a) ? resultToValue(a) : resultToBox(a, undefined)))
      return vra.filter((a) => isResultErr(a)).length === vra.length ? result.Err(va) : result.Ok(va)
    },
    mergeOk: (o) => {
      let v = o.get()
      let vra = []
      for (let i = 0; i < Object.keys(v.results).length; i++) vra.push(v.results[i])
      let va = vra.map((a) => (isResultOk(a) ? resultToValue(a) : undefined)).filter((a) => a !== undefined)
      return va.length === 0 ? result.Err(vra.map((a) => resultToValue(a))) : result.Ok(va)
    },
  }).set({
    results: {},
    total: total,
    queues: queues,
  })

  let onceHandoff = once(handoff)

  let fn = curry((index) =>
    composeF(
      curry((next, a) => {
        results.takeOne(fn)
        next(a)
      }),
      traverseResolve(method, cancels, results, index, onceHandoff),
      runBoxOk(cancels.push, unit, get("state")), // run box ok
      resolvePromiseOk(abortController, a => travFn(a, index)),
      curry((next, a) => next(result.Ok(a))),
      logF("trav run step 1")
    )
  )

  if (mode === Box.TraverseSeries) results.takeOne(fn)
  else if (isInteger(mode)) results.takeN(mode, fn)
  else results.takeAll(fn)
})

// resolveFirst :: Store v -> Store v -> ((Pair r s) -> ()) -> result e o -> ()
const resolveFirst = curry((called, state, cancel, resolve, next, res) => {
  if (called.get() !== "called") {
    called.set("called")
    handoffToResolve(state.get, resolve, next, res)
    cancel()
  }
})

// maybeToBox :: c -> (a -> Maybe b) -> Box r
// maybeToBox :: c -> Maybe b -> Box r
const maybeToBox = curry((err, maybe) => {
  if (isFunction(maybe)) {
    return (x) => {
      const m = maybe(x)

      if (!isSameType(Maybe, m)) throw new TypeError("maybeToBox: Maybe or Maybe returning function required")

      return m.either(constant(Box.Err(err)), Box.Ok)
    }
  }
  if (!isSameType(Maybe, maybe)) throw new TypeError("maybeToBox: Maybe or Maybe returning function required")

  return maybe.either(constant(Box.Err(err)), Box.Ok)
})

// ResultToBox :: c -> (a -> Result b) -> Box r
// ResultToBox :: c -> Result b -> Box r
const ResultToBox = curry((result) => {
  if (isFunction(result)) {
    return (x) => {
      const m = result(x)

      if (!isSameType(crocks.Result, m))
        throw new TypeError("ResultToBox: Result or Result returning function required")

      return m.either(Box.Err, Box.Ok)
    }
  }
  if (!isSameType(crocks.Result, result))
    throw new TypeError("ResultToBox: Result or Result returning function required")

  return result.either(Box.Err, Box.Ok)
})

var gid = 1
export function Box(fn, u, st) {
  var of = _of

  var exp = {
    id: gid++,
    cancel: null,
    abortController: new AbortController(),
  }

  if (!isFunction(fn)) {
    // shifting fn->u, u->st
    st = u
    u = fn
    return Box.of(u, st)
  }

  var x = u === undefined ? symNoData : !result.includes(u) ? result.Ok(u) : u

  var _state = st === undefined ? symNoData : st

  function either(f, g) {
    let caseOf = _either(f, g)
    return x === symNoData ? caseOf : constant(caseOf(x))
  }

  var inspect = function () {
    let f = either(
      (l) => "Err" + _inspect(l),
      (r) => "Ok" + _inspect(r)
    )
    return `Box ` + (isFnType("_constant", f) ? f() : _inspect(fn)) + (_state !== symNoData ? ` state: ${_state}` : "")
  }

  var extract = function () {
    let f = either(
      (l) => "Err:" + l,
      (r) => r
    )
    if (isFnType("_constant", f)) return f()
    return symNoData
  }

  const toPair = () => Pair(x === symNoData ? result.Err(null) : x, _state === symNoData ? undefined : _state)
  const toResult = () => (x === symNoData ? result.Err(null) : x)
  const toValue = () => (x === symNoData ? undefined : resultToValue(x))
  const toState = () => _state
  const toJson = () => ({
    "result": x === symNoData
      ? { "err": null }
      : !isResult(x)
        ? { "err": null }
        : x.tag() === "Ok"
          ? { "ok": x.b.value() }
          : { "err": x.a.value() },
    "state": _state
  })

  // runWith :: (Pair r s -> (() -> ())) -> s -> (() -> ())
  function runWith(resolve, state) {
    if (!isFunction(resolve)) {
      Box.debug === false || console.log(`resolve: ${resolve}`)
      throw new TypeError("Box.run: function required for `resolve`")
    }

    let cancelled = false // eslint-disable-line no-unused-vars

    const _cancel = () => {
      cancelled = true
      exp.abortController.abort("cancelled")
      Box.debug === false || console.log(`cancel Box:${exp.id}`)
    }

    const settle = (f, x) => {
      if (cancelled) return unit()
      return f(x)
    }

    Box.debug === false ||
      console.log(`run Box:(${exp.id}) fn:${fn.nm} resolve:${resolve.nm} state:${state} cancelled:${cancelled}`)
    const internal = fn(settle.bind(null, resolve), state) // fn(resolve, state)
    const internalFn = isFunction(internal) ? internal : unit
    exp.cancel = once(() => _cancel(internalFn()))
    return exp.cancel
  }

  // map :: (a -> b) -> Box r s
  function map(mapFn) {
    if (!isFunction(mapFn)) throw new TypeError("Box.map: Parameter must be function")
    return Box((resolve, state) => {
      let { get, set } = Store()
      return runWith(
        composeF(
          handoffToResolve(get("state"), resolve),
          resolvePromiseOk(exp.abortController, mapFn),
          startChain(set("result"), set("state"))
        ),
        state
      )
    })
  }

  // bimap :: (a -> b) -> (c -> d) -> Box r s
  function bimap(errFn, okFn) {
    if (!isFunction(errFn) || !isFunction(okFn)) throw new TypeError("Box.bimap: Both parameters must be functions ")
    return Box((resolve, state) => {
      let { get, set } = Store()
      return runWith(
        composeF(
          handoffToResolve(get("state"), resolve),
          resolvePromiseEither(exp.abortController, errFn, okFn),
          startChain(set("result"), set("state"))
        ),
        state
      )
    })
  }

  // alt :: ((a -> Box r s) | Box r s) -> Box r s
  function alt(m) {
    let altFn = m
    if (!isFunction(altFn) && !Box.isBox(m))
      throw new TypeError("Box.alt: Parameter must either be a Box or a function returning Box ")
    return Box((resolve, state) => {
      let { get, set } = Store()
      set("innerCancel", unit)
      let cancel = runWith(
        composeF(
          handoffToResolve(get("state"), resolve),
          eitherAlt(get("result")),
          runBoxErr(set("innerCancel"), set("state"), get("state")),
          callAltFn(exp.abortController, altFn),
          startChain(set("result"), set("state"))
        ),
        state
      )
      return once(() => {
        let innerCancelFn = get("innerCancel")()
        cancel(isFunction(innerCancelFn) ? innerCancelFn() : undefined)
      })
    })
  }

  // chain :: (a -> Box r s) -> Box r s
  function chain(chainFn) {
    if (!isFunction(chainFn)) throw new TypeError("Box.chain: Parameter must be function")
    return Box((resolve, state) => {
      let { get, set } = Store()
      set("innnerCancel", unit)
      let cancel = runWith(
        composeF(
          handoffToResolve(get("state"), resolve),
          runBoxOk(set("innerCancel"), set("state"), get("state")),
          resolvePromiseOk(exp.abortController, chainFn),
          startChain(set("result"), set("state"))
        ),
        state
      )
      return once(() => {
        let innerCancelFn = get("innerCancel")()
        cancel(isFunction(innerCancelFn) ? innerCancelFn() : undefined)
      })
    })
  }

  // chainSetPath :: [path] -> (a -> Box r s) -> Box r s
  function chainSetPath(path, chainFn) {
    return chain((args) => chainFn().map((x) => setPath(path, constant(x), args)))
  }

  // chainWithIsCancelled ::  Passes a isCancelled fn also as the second parameter
  // chainWithIsCancelled :: (a -> (() -> boolean) -> Box r s) -> Box r s
  function chainWithIsCancelled(chainFn) {
    return chain((args) => {
      let box = Box(args)
      return box.chain(x => chainFn(x, () => Box.isCancelled(box)))
    })
  }

  // bichain :: (a -> Box r s) -> (b -> Box r s) -> Box r s
  function bichain(errFn, okFn) {
    if (!isFunction(errFn) || !isFunction(okFn)) throw new TypeError("Box.bichain: Both params must be functions ")
    return Box((resolve, state) => {
      let { get, set } = Store()
      set("innnerCancel", unit)
      let cancel = runWith(
        composeF(
          handoffToResolve(get("state"), resolve),
          runBoxEither(set("innerCancel"), set("state"), get("state")),
          resolvePromiseEither(exp.abortController, errFn, okFn),
          startChain(set("result"), set("state"))
        ),
        state
      )
      return once(() => {
        let innerCancelFn = get("innerCancel")()
        cancel(isFunction(innerCancelFn) ? innerCancelFn() : undefined)
      })
    })
  }

  // chainAll :: Box(x).chainAll([ c1, c2, c3]) == Box(x).chain(c1).chain(c2).chain(c3)
  // chainAll :: [(a -> Box r s)] -> Box r s
  function chainAll(chainFns) {
    if (!isArray(chainFns) || chainFns.filter((fn) => !isFunction(fn)).length)
      throw new TypeError(`Box.chainAll: Param should be an array of functions --${chainFns}--`)
    if (chainFns.length === 0) return chain((x) => Box(x))
    return chainFns.reduce((box, chainFn) => (box && box.chain ? box.chain(chainFn) : chain(chainFn)), null)
  }

  // mapAll :: Box(x).mapAll([ c1, c2, c3]) == Box(x).map(c1).map(c2).map(c3)
  // mapAll :: [(a -> b)] -> Box r s
  function mapAll(mapFns) {
    if (!isArray(mapFns) || mapFns.filter((fn) => !isFunction(fn)).length)
      throw new TypeError("Box.mapAll: Param should be an array of functions")
    if (mapFns.length === 0) return map((x) => x)
    return mapFns.reduce((box, mapFn) => (box && map.chain ? box.map(mapFn) : map(mapFn)), null)
  }

  // ap :: ((a -> Box r s) | Box r s) -> Box r s
  function ap(m) {
    let apFn = m
    if (!isFunction(apFn) && !Box.isBox(m))
      throw new TypeError("Box.ap: Parameter must either be a Box or a function returning Box")
    return Box((resolve, state) => {
      let { get, set } = Store()
      set("innerCancel", unit)
      let cancel = runWith(
        composeF(
          handoffToResolve(get("state"), resolve),
          runApFunc(get("result")),
          runBoxOk(set("innerCancel"), set("state"), get("state")),
          callFnOrBox(exp.abortController, apFn),
          verifyAp,
          startChain(set("result"), set("state"))
        ),
        state
      )
      return once(() => {
        let innerCancelFn = get("innerCancel")()
        cancel(isFunction(innerCancelFn) ? innerCancelFn() : undefined)
      })
    })
  }

  // race :: ((a -> Box r s) | Box r s) -> Box r s
  function race(m) {
    let raceFn = m
    if (!isFunction(raceFn) && !Box.isBox(m))
      throw new TypeError("Box.race: Parameter must either be a Box or a function returning Box")

    return Box((resolve, state) => {
      let { get, set, keyf } = Store()
      let _state = keyf("state")
      let called = keyf("called")
      let innerCancel = keyf("innerCancel").set(unit)

      let cancel = runWith(
        composeF(resolveFirst(called, _state, innerCancel.get(), resolve), startChain(set("result"), set("state"))),
        state
      )

      composeF(
        resolveFirst(called, _state, cancel, resolve),
        runBoxOk(set("innerCancel"), set("state2"), get("state")),
        callFnOrBox(exp.abortController, raceFn)
      )(result.Ok(undefined))

      return once(() => {
        let innerCancelFn = get("innerCancel")()
        cancel(isFunction(innerCancelFn) ? innerCancelFn() : undefined)
      })
    })
  }

  // traverse :: (a -> Box r s) -> str -> (str|int) -> Box r s
  function traverse(travFn, method = Box.TraverseAll, mode = Box.TraverseParallel) {
    if (!isFunction(travFn)) throw new TypeError("Box.traverse: Parameter must be a function returning Box")
    if (
      !(
        method === Box.TraverseAll ||
        method === Box.TraverseAllOk ||
        method === Box.TraverseAllSettled ||
        method === Box.TraverseAny ||
        method === Box.TraverseRace
      )
    )
      throw new TypeError("Box.traverse: method needs to be All | AllSettled | AllOk | Any | Race")

    if (!(mode === Box.TraverseSeries || mode === Box.TraverseParallel || (isInteger(mode) && mode > 0 && mode < 1000)))
      throw new TypeError("Box.traverse: mode needs to be Series | Parallel | Integer")
    return Box((resolve, state) => {
      let { get, set, keyf } = Store()
      let cancels = keyf("cancels", {
        push: (o, c) => {
          o.modify((v) => {
            v.values.push(c)
            return v
          })
        },
        merge: (o) => {
          let v = o.get().values
          if (isArray(v) && v.length) composeA(v)()
        },
      }).set({
        values: [],
      })

      let cancel = runWith(
        composeF(
          handoffToResolve(get("state"), once(resolve)),
          logF("traverse step 3"),
          traverseRun(exp.abortController, travFn, cancels, method, mode),
          logF("traverse step 2"),
          startChain(set("result"), set("state")),
          logF("traverse step 1")
        ),
        state
      )

      cancels.push(cancel)
      return cancels.merge
    })
  }

  // traverseAllParallel :: (a -> Box r s) -> Box r s
  function traverseAllParallel(travFn) {
    return traverse(travFn, Box.TraverseAll, Box.TraverseParallel)
  }

  // traverseAllSeries :: (a -> Box r s) -> Box r s
  function traverseAllSeries(travFn) {
    return traverse(travFn, Box.TraverseAll, Box.TraverseSeries)
  }

  // traverseAnyParallel :: (a -> Box r s) -> Box r s
  function traverseAnyParallel(travFn) {
    return traverse(travFn, Box.TraverseAny, Box.TraverseParallel)
  }

  // traverseAnySeries :: (a -> Box r s) -> Box r s
  function traverseAnySeries(travFn) {
    return traverse(travFn, Box.TraverseAny, Box.TraverseSeries)
  }

  // traverseAllSettledParallel :: (a -> Box r s) -> Box r s
  function traverseAllSettledParallel(travFn) {
    return traverse(travFn, Box.TraverseAllSettled, Box.TraverseParallel)
  }

  // traverseAllSettledSeries :: (a -> Box r s) -> Box r s
  function traverseAllSettledSeries(travFn) {
    return traverse(travFn, Box.TraverseAllSettled, Box.TraverseSeries)
  }

  // traverseAllOkParallel :: (a -> Box r s) -> Box r s
  function traverseAllOkParallel(travFn) {
    return traverse(travFn, Box.TraverseAllOk, Box.TraverseParallel)
  }

  // traverseAllOkSeries :: (a -> Box r s) -> Box r s
  function traverseAllOkSeries(travFn) {
    return traverse(travFn, Box.TraverseAllOk, Box.TraverseSeries)
  }

  // traverseRace :: (a -> Box r s) -> Box r s
  function traverseRace(travFn) {
    return traverse(travFn, Box.TraverseRace, Box.TraverseParallel)
  }

  // runPromise :: s -> (Pair r s -> Box r s) -> ()
  function runPromise(s, to = Box.pairToBox, setCancelFn = unit) {
    return new Promise((resolve) => {
      const rmEvList = (x) => {
        exp.abortController.signal.removeEventListener("abort", abortListener)
        return x
      }
      resolve.nm = "promresolve"
      // eslint-disable-next-line no-unused-vars
      let cancel = runWith(compose(rmEvList, resolve, log("runp step 2"), to, log("runp inp")), s)
      if (isFunction(setCancelFn)) setCancelFn(cancel)
      const abortListener = ({ target }) => {
        rmEvList()
        compose(resolve, to)(Pair(result.Err(target.reason), undefined))
      }
      exp.abortController.signal.addEventListener("abort", abortListener)
    })
  }

  // run :: ((Pair r s) -> (() ())) -> s -> (Pair r s -> Box r s) -> (() -> ())
  function run(resolve, s, to = Box.pairToBox) {
    if (!isFunction(resolve)) throw new TypeError("Box.run: Function required")
    return runWith(compose(resolve, log("run step 2"), to || Box.pairToBox, log("run inp")), s)
  }

  return {
    of,
    ap,
    exp,
    either,
    extract,
    run,
    map,
    bimap,
    alt,
    chain,
    chainSetPath,
    chainWithIsCancelled,
    bichain,
    chainAll,
    mapAll,
    race,
    traverse,
    traverseAllSeries,
    traverseAllParallel,
    traverseAnyParallel,
    traverseAnySeries,
    traverseAllSettledSeries,
    traverseAllSettledParallel,
    traverseAllOkSeries,
    traverseAllOkParallel,
    traverseRace,
    runPromise,
    inspect,
    type,
    toString: inspect,
    toPair,
    toResult,
    toValue,
    toState,
    toJson,
    constructor: Box,
  }
}
Box.of = _of
Box.type = type

const pairToBox = unary(
  compose(converge(binary(Box.of), fst, snd), unless(isSameType(Pair), throwError("pairToBox: Pair needed")))
)
Box.getState = getState
Box.modifyState = curry(modifyState)
Box.Pair = Pair
Box.Err = compose(Box, result.Err)
Box.Ok = compose(Box, result.Ok)
Box.pairToResult = pairToResult
Box.pairToArray = pairToArray
Box.pairToBox = pairToBox
Box.pairToPair = identity
Box.pairToState = pairToState
Box.pairToValue = pairToValue
Box.toPair = unary(compose((box) => box.toPair(), unless(and(isBox, inBoxMode), throwError("Box.toPair Box needed"))))
Box.toResult = unary(
  compose((box) => box.toResult(), unless(and(isBox, inBoxMode), throwError("Box.toResult Box needed")))
)
Box.toValue = unary(
  compose((box) => box.toValue(), unless(and(isBox, inBoxMode), throwError("Box.toValue Box needed")))
)
Box.toState = unary(
  compose((box) => box.toState(), unless(and(isBox, inBoxMode), throwError("Box.toState Box needed")))
)
Box.toJson = unary(
  compose((box) => box.toJson(), unless(and(isBox, inBoxMode), throwError("Box.toJson Box needed")))
)

Box.buildPair = binary((x, s) => Pair(result.Ok(x), s))
Box.fromPromise = fromPromise
Box.fromPromiseLazy = fromPromiseLazy
Box.rejectAfter = rejectAfter
Box.resolveAfter = resolveAfter
Box.waitUntil = waitUntil
Box.isBox = isBox
Box.debug = false
Box.result = result
Box.tee = compose(snd, bimap(log, identity), branch)
Box.log = (x) => console.log(`log:- ${x.inspect ? x.inspect() : x}`)
Box.delay = curry(Box.resolveAfter)
Box.TraverseAll = "All"
Box.TraverseAllSettled = "AllSettled"
Box.TraverseAllOk = "AllOk"
Box.TraverseAny = "Any"
Box.TraverseRace = "Race"
Box.TraverseSeries = "Series"
Box.TraverseParallel = "Parallel"
Box.maybeToBox = maybeToBox
Box.ResultToBox = ResultToBox
Box.isResult = isResult
Box.isResultOk = isResultOk
Box.isResultErr = isResultErr
Box.isCancelled = isCancelled

// isOk isBoxOk :: Box r s -> bool
Box.isOk = compose(isResultOk, Box.toResult)
// isErr isBoxErr :: Box r s -> bool
Box.isErr = compose(isResultErr, Box.toResult)
Box.tmp = {
  isResult,
  isResultOk,
  compose,
  resultToValue,
  updateValueResult,
  _either,
  resultToPair,
  resultToBox,
  composeF,
  pipeF,
  startChain,
  resolvePromiseOk,
  handoffToResolve,
  Store,
}
Box.sym = {
  symErr: symErr,
  symNoData: symNoData,
}
