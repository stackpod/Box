var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.mjs
var src_exports = {};
__export(src_exports, {
  Box: () => Box,
  Store: () => Store
});
module.exports = __toCommonJS(src_exports);

// src/Box.js
var import_crocks4 = __toESM(require("crocks"), 1);

// src/inspect.js
var import_crocks = __toESM(require("crocks"), 1);
var { isFunction, isString, isArray, isObject, isSymbol, isDate } = import_crocks.default;
function arrayInspect(xs) {
  return xs.length ? xs.map(inspect).reduce(function(a, x) {
    return a + "," + x;
  }) : xs;
}
function inspect(x) {
  if (x && isFunction(x.inspect)) {
    return " " + x.inspect();
  }
  if (isFunction(x)) {
    return " Function";
  }
  if (isArray(x)) {
    return " [" + arrayInspect(x) + " ]";
  }
  if (isObject(x)) {
    if (Object.keys(x).length > 10)
      return " <Long Object>";
    return " { " + Object.keys(x).reduce(function(acc, key) {
      return acc.concat([key + ":" + inspect(x[key])]);
    }, []).join(", ") + " }";
  }
  if (isString(x)) {
    if (x.length > 100)
      return ' "' + x.slice(0, 100) + `.... (${x.length})"`;
    return ' "' + x + '"';
  }
  if (isSymbol(x) || isDate(x)) {
    return " " + x.toString();
  }
  return " " + x;
}

// src/Box.js
var R = __toESM(require("ramda"), 1);

// src/union.js
var import_crocks2 = __toESM(require("crocks"), 1);
var { curry, isArray: isArray2, isEmpty, isFunction: isFunction2, isObject: isObject2, isString: isString2 } = import_crocks2.default;
var constant = function(x) {
  return function() {
    return x;
  };
};
var isDefinition = function(x) {
  return isString2(x) && x.length;
};
function caseOf(defs) {
  return function(cases, m) {
    var tag = m.tag;
    var def = defs[tag()];
    var args = def.reduce(function(xs, x) {
      return xs.concat([m[x].value()]);
    }, []);
    let ret = cases[tag()].apply(null, args);
    return ret;
  };
}
var includes = function(defs) {
  return function(m) {
    let ret = !!m && isFunction2(m.tag) && Object.keys(defs).indexOf(m.tag()) !== -1;
    return ret;
  };
};
function construction(def, tag) {
  return function() {
    var args = [], len = arguments.length;
    while (len--)
      args[len] = arguments[len];
    return def.reduce(
      function(obj, key, index) {
        obj[key] = { value: constant(args[index]) };
        return obj;
      },
      { tag: constant(tag), inspect: inspect2, toString: inspect2 }
    );
  };
}
function inspect2() {
  if (this.caseOf && this.includes) {
    let vals = Object.keys(this).filter((x) => x !== "inspect" && x !== "caseOf" && x !== "includes" && x !== "toString").join(" ");
    return `Union of types: ${vals}`;
  } else if (this.tag && isFunction2(this.tag)) {
    let keys = Object.keys(this).filter((x) => x !== "inspect" && x !== "tag" && x !== "toString");
    let tag = this.tag ? this.tag() : "notag";
    let vals = keys.map((x) => isFunction2(this[x]?.value) ? this[x]?.value() : "invalid union value").join(" ");
    return `${tag} ${vals}`;
  } else
    return `invalid union`;
}
function defineUnion(defs) {
  if (!isObject2(defs) || isEmpty(defs)) {
    throw new TypeError("defineUnion: Argument must be an Object containing definition lists");
  }
  return Object.keys(defs).reduce(
    function(obj, tag) {
      var def = defs[tag];
      if (!isArray2(def) || !def.reduce(function(x, y) {
        return x && isDefinition(y);
      }, true)) {
        throw new TypeError("defineUnion: Definitions must be a list of non-empty string identifiers");
      }
      obj[tag] = construction(def, tag);
      return obj;
    },
    { caseOf: curry(caseOf(defs)), includes: curry(includes(defs)), inspect: inspect2, toString: inspect2 }
  );
}

// src/Store.js
var import_crocks3 = __toESM(require("crocks"), 1);
var import_inspect = __toESM(require("crocks/core/inspect.js"), 1);
var { isFunction: isFunction3, isObject: isObject3, curry: curry2 } = import_crocks3.default;
var _of = function(u) {
  return Store(isObject3(u) ? u : {});
};
function Store(u) {
  var of = _of;
  var obj = isObject3(u) ? u : {};
  var inspect3 = () => {
    return "Store" + (0, import_inspect.default)(obj);
  };
  const get = curry2((key, _) => {
    if (key in obj)
      return obj[key];
    return void 0;
  });
  const set = curry2((key, val) => {
    obj[key] = val;
    return val;
  });
  const modify = curry2((key, fn) => {
    if (!isFunction3(fn))
      throw new Error("Store.modify: Should receive a fucntion");
    let v = fn(get(key)());
    return set(key)(v);
  });
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
        set(key, x);
        return o;
      },
      modify: (fn) => {
        modify(key, fn);
        return o;
      }
    };
    if (!fns)
      return o;
    Object.keys(fns).forEach((k) => {
      if (!isFunction3(fns[k]))
        throw new Error("Store.keyf: The second argument should contain a object of keys and functions");
      o[k] = (...args) => fns[k](o, ...args);
    });
    return o;
  };
  return {
    of,
    get,
    set,
    modify,
    keyf,
    inspect: inspect3,
    constructor: Store
  };
}
Store.of = _of;
var Cache = (expireAfter = 3e3) => {
  var { get, set } = Store({});
  var key = "key";
  const expireKeys = () => {
    let val = get(key)();
    Object.keys(val).forEach((k) => {
      if (val[k]?.setTime && Date.now() - val[k].setTime > expireAfter)
        delete val[k];
    });
    set(key, val);
  };
  const cacheSet = (key2, k, x) => {
    setTimeout(() => expireKeys(), 1);
    let val = get(key2)();
    set(key2, { ...val, [k]: { value: x, setTime: Date.now() } });
    return x;
  };
  const cacheGet = (key2, k) => {
    setTimeout(() => expireKeys(), 1);
    let val = get(key2)();
    if (!isObject3(val))
      throw new Error("Store.cache: the value set is not an object, unexplained");
    if (!isObject3(val[k]) || val[k]?.setTime && Date.now() - val[k].setTime > expireAfter) {
      if (isFunction3(get("getFn")()[k])) {
        let v = get("getFn")()[k]();
        if (Box.isBox(v)) {
          v = v.map((x) => {
            cacheSet(key2, k, x);
            return x;
          });
        } else
          cacheSet(key2, k, v);
        return v;
      }
      return void 0;
    } else
      return val[k].value;
  };
  let o = {
    get: (k) => cacheGet(key, k),
    set: (k, x) => {
      cacheSet(key, k, x);
      return o;
    },
    getFn: (k, fn) => {
      set("getFn", { ...get("getFn"), [k]: () => fn(k) });
      return o;
    }
  };
  set(key, {});
  set("getFn", {});
  return o;
};
var gStore = Store();
var gCache = Cache();

// src/Box.js
var {
  Pair,
  Maybe,
  branch,
  isFunction: isFunction4,
  isObject: isObject4,
  isArray: isArray3,
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
  curry: curry3,
  ifElse,
  when,
  unless,
  and
  // flip,
} = import_crocks4.default;
var type = () => "Box";
var converge2 = curry3((f, g, h, x, y) => curry3(f)(g(x), h(y)));
var setPath = curry3(
  (path, fn) => ifElse(
    R.hasPath(path),
    // if path exists
    R.modifyPath(path, fn),
    // modifyPath
    R.assocPath(path, fn(void 0))
    // else create it
  )
);
var symNoData = Symbol("no data");
var symErr = Symbol("Err");
var constant2 = (x) => {
  let f = () => x;
  f.type = "_constant";
  return f;
};
constant2.type = () => "constant";
var throwError = (e) => () => {
  throw new TypeError(e);
};
var arrayToIndexedArray = (a) => isArray3(a) ? a.map((v, i) => [v, i]) : [[a, 0]];
var composeF = (...args) => {
  args = [binary(unit), ...args];
  const _composeF = (...args2) => args2.length === 0 ? throwError("args needed")() : args2.length === 1 ? args2[args2.length - 1] : args2[args2.length - 1](_composeF(...args2.slice(0, args2.length - 1)));
  return _composeF(...args);
};
var pipeF = (...args) => composeF(...args.reverse());
var composeA = (args) => compose(...args);
var isFnType = (type2, f) => isFunction4(f) && f.type === type2;
var isBox = (box) => isObject4(box) && isFunction4(box.type) && box.type() === "Box";
var inBoxMode = (box) => box.extract() !== symNoData;
var result = defineUnion({ Err: ["a"], Ok: ["b"] });
var log = (str) => (x) => {
  Box.debug ? console.log(`log -> ${str}`, inspect(x)) : "";
  return x;
};
var logF = curry3((str, next, x) => {
  Box.debug ? console.log(`logF -> ${str}`, inspect(x)) : "";
  return next(x);
});
var isResult = (r) => {
  return result.includes(r) && isFunction4(r.tag) && (isFunction4(r.a?.value) || isFunction4(r.b?.value));
};
var isResultOk = ifElse(isResult, (r) => r.tag() === "Ok", constant2(false));
var isResultErr = ifElse(isResult, (r) => r.tag() === "Err", constant2(false));
var updateValueResult = (r, v) => {
  if (!isResult(r))
    throw new TypeError("Box.updateResult: Argument must be a result type");
  if (r.tag() == "Ok")
    return result.Ok(v);
  else
    return result.Err(v);
};
var resultToBox = compose2((r, s) => Box(r, s), unless(isResult, throwError("resultToBox: Result needed")), identity);
var resultToPair = compose2(Pair, unless(isResult, throwError("resultToPair: Result needed")), identity);
var resultToValue = unary(
  compose((r) => r.a ? r.a.value() : r.b.value(), unless(isResult, throwError("resultToValue: Result needed")))
);
function getState(fn) {
  if (!isFunction4(fn))
    fn = identity;
  return Box((resolve, s) => resolve(Pair(result.Ok(fn(s)), s)));
}
function modifyState(fn, x) {
  if (!isFunction4(fn))
    throw new TypeError("Box.modifyState: Function Required");
  return Box((resolve, s) => resolve(Pair(result.Ok(x), fn(s))));
}
function fromPromise(fn) {
  if (!isFunction4(fn))
    throw new Error("Box.fromPromise: Promise returning function required");
  const _fn = curry3(fn);
  return function() {
    var args = arguments;
    const promise = _fn.apply(null, args);
    if (isFunction4(promise))
      return fromPromise(promise);
    return Box((resolve, state) => {
      if (!isPromise(promise))
        throw new Error("Box.fromPromise: Promise returning function required");
      promise.then(
        (x) => resolve(Pair(result.Ok(x), state)),
        (e) => resolve(Pair(result.Err(e), state))
      );
    });
  };
}
function fromPromiseLazy(fn) {
  if (!isFunction4(fn))
    throw new Error("Box.fromPromiseLazy: Promise returning function required");
  return function() {
    var args = arguments;
    return Box((resolve, state) => {
      const promise = fn.apply(null, args);
      if (!isPromise(promise))
        throw new Error("Box.fromPromiseLazy: promise returning function required");
      promise.then(
        (x) => resolve(Pair(result.Ok(x), state)),
        (e) => resolve(Pair(result.Err(e), state))
      );
    });
  };
}
var rejectAfter = (ms, value) => {
  if (!(isInteger(ms) && ms >= 0))
    throw new TypeError("Box.rejectAfter: First argument must be a positive Integer");
  return Box((resolve, state) => {
    const token = setTimeout(() => {
      resolve(Pair(result.Err(value), state));
    }, ms);
    return () => {
      clearTimeout(token);
    };
  });
};
var resolveAfter = (ms, value) => {
  if (!(isInteger(ms) && ms >= 0))
    throw new TypeError("Box.resolveAfter: First argument must be a positive Integer");
  return Box((resolve, state) => {
    const token = setTimeout(() => {
      resolve(Pair(result.Ok(value), state));
    }, ms);
    return () => {
      clearTimeout(token);
    };
  });
};
var waitUntil = curry3((timeout, interval, fn, a) => {
  if (!isNumber(timeout) || !isNumber(interval))
    throw new TypeError("Box.waitUntil: First two arguments must be a number");
  if (!isFunction4(fn))
    throw new TypeError("Box.waitUntil: Third argument must be a function");
  const cfn = (x) => Box(x).chain(Box.delay(interval)).chain((x2) => {
    let o = fn(x2);
    return isBox(o) ? o.chain((y) => y ? Box(x2) : cfn(x2)) : o ? Box(x2) : cfn(x2);
  });
  return Box(a).chain(cfn).race(Box.rejectAfter(timeout, "Box.waitUntil: Timed out"));
});
var resolvePromise = (resolve) => (promise) => {
  if (!isPromise(promise))
    return resolve(isResult(promise) ? promise : result.Ok(promise));
  promise.then(
    (x) => resolve(result.Ok(x)),
    (e) => resolve(result.Err(e))
  );
};
var _either = (f, g) => {
  if (!isFunction4(f) || !isFunction4(g)) {
    throw new TypeError("Box.either: Requires both functions");
  }
  return (a) => result.caseOf({ Err: f, Ok: g }, a);
};
var concatAltErr = (fst2, snd2) => result.Err(snd2);
var resultToArray = (u) => {
  let e = false;
  let o = _either(
    compose((x) => {
      e = true;
      return x;
    }, identity),
    identity
  )(u);
  if (e)
    return [o, null];
  return [null, o];
};
var unsafeSnd = (a) => a[1];
var _of2 = function(x, st) {
  let u = result.includes(x) ? x : result.Ok(x);
  let fn1 = (resolve, s) => resolve(Pair(u, s || st));
  fn1.nm = "Box.of";
  return Box(fn1, u, st);
};
var pairToResult = unary(compose(fst, unless(isSameType(Pair), throwError("pairToResult: Pair needed"))));
var pairToArray = unary(
  compose(resultToArray, pairToResult, unless(isSameType(Pair), throwError("pairToArray: Pair needed")))
);
var pairToState = unary(compose(snd, unless(isSameType(Pair), throwError("pairToState: Pair needed"))));
var pairToValue = unary(
  compose(unsafeSnd, resultToArray, fst, unless(isSameType(Pair), throwError("pairToValue: Pair needed")))
);
var startChain = curry3(
  (storeResult, storeState, next) => compose(
    unit,
    bimap(next, identity),
    // process next
    bimap(storeResult, storeState),
    // store state
    log("startChain")
  )
);
var resolvePromiseOk = curry3(
  (mapFn, next) => _either(
    compose(next, result.Err),
    // for error, just next
    compose(resolvePromise(next), mapFn)
    // for ok, resolve promise and then next
  )
);
var resolvePromiseErr = curry3(
  (mapFn, next) => _either(
    compose(resolvePromise(next), mapFn),
    // for err, resolve promise and then next
    compose(next, result.Err)
    // for ok, just next
  )
);
var resultForceError = _either(compose(result.Err), compose(result.Err));
var resolvePromiseEither = curry3(
  (errFn, okFn, next) => _either(
    compose(resolvePromise(compose(next, resultForceError)), errFn),
    // resolve for err
    compose(resolvePromise(next), okFn)
    // as well as for ok. One of them will get called
  )
);
var callAltFn = curry3(
  (altFn, next) => _either(
    ifElse(
      () => isBox(altFn),
      // condition
      compose(next, () => result.Err(altFn)),
      // if
      compose(resolvePromise(compose(next, resultForceError)), (x) => isFunction4(altFn) ? altFn(x) : x)
      // else
    ),
    compose(next, result.Ok)
  )
);
var callFnOrBox = curry3(
  (fn, next) => _either(
    compose(next, result.Err),
    ifElse(
      () => isBox(fn),
      // condition
      compose(next, () => result.Ok(fn)),
      // if
      compose(resolvePromise(next), (x) => isFunction4(fn) ? fn(x) : x)
      // else
    )
  )
);
var chainBoxToResult = (setState) => compose(fst, bimap(identity, setState), Box.toPair);
var runBoxOk = curry3(
  (setCancel, setState, getState2, next) => _either(
    compose(next, result.Err),
    // Error part, just send it as is
    compose(
      (box) => setCancel(box.run(compose(next, chainBoxToResult(setState)), getState2())),
      unless(isBox, throwError("Box.runbox: Need to return type Box"))
    )
  )
);
var runBoxErr = curry3(
  (setCancel, setState, getState2, next) => _either(
    compose(
      (box) => setCancel(box.run(compose(next, chainBoxToResult(setState)), getState2())),
      unless(isBox, throwError("Box.runbox: Need to return type Box")),
      log("runBoxErr err")
    ),
    compose(next, result.Ok, log("runBoxErr ok"))
    // Ok part, just send it as is
  )
);
var runBoxEither = curry3(
  (setCancel, setState, getState2, next) => _either(
    compose(
      (box) => setCancel(box.run(compose(next, resultForceError, chainBoxToResult(setState)), getState2())),
      unless(isBox, throwError("Box.runbox: Need to return type Box"))
    ),
    compose(
      (box) => setCancel(box.run(compose(next, chainBoxToResult(setState)), getState2())),
      unless(isBox, throwError("Box.runbox: Need to return type Box"))
    )
  )
);
var handoffToResolve = curry3(
  (getState2, resolve, next) => compose(
    next,
    resolve,
    // final resolve
    (r) => resultToPair(r, getState2()),
    // Compute Pair
    log("hoff")
  )
);
var eitherAlt = curry3((origResult, next, altr) => {
  origResult = isFunction4(origResult) ? origResult() : origResult;
  return next(
    _either(
      (e) => _either((me) => concatAltErr(e, me), result.Ok)(altr),
      // orig err. Alt err and Alt ok casess
      result.Ok
      // orig ok
    )(origResult)
  );
});
var verifyAp = curry3(
  (next) => _either(
    compose(next, result.Err),
    // err
    ifElse(isFunction4, compose(next, result.Ok), throwError("Ap parameter must be a function"))
    // ok
  )
);
var runApFunc = curry3(
  (origResult, next, apResult) => _either(
    compose(next, result.Err),
    // orig Err as is
    (fn) => {
      return _either(
        compose(next, result.Err),
        // Err
        compose(next, result.Ok, fn)
        // Run fn(x)
      )(apResult);
    }
  )(isFunction4(origResult) ? origResult() : origResult)
);
var traverseResolve = curry3((method, cancels, results, index, end, next, r) => {
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
  )(r);
});
var traverseRun = curry3((travFn, cancels, method, mode, handoff, inResult) => {
  if (!isResultOk(inResult))
    return handoff(inResult);
  let queues = arrayToIndexedArray(resultToValue(inResult));
  let total = queues.length;
  if (total === 0)
    return handoff(inResult);
  var { get, keyf } = Store();
  let results = keyf("results", {
    isAllProcessed: (o) => Object.keys(o.get().results).length === o.get().total,
    takeOne: (o, next) => o.modify((v) => {
      let a = v.queues.shift();
      if (isArray3(a) && a.length === 2)
        next(a[1], a[0]);
      return v;
    }),
    takeAll: (o, next) => {
      o.modify((v) => {
        v.queues.map((a) => isArray3(a) && a.length === 2 && next(a[1], a[0]));
        v.queues = [];
        return v;
      });
    },
    queue: (o, i) => (r) => {
      o.modify((v) => {
        v.queues[i] = r;
        return v;
      });
    },
    append: (o, i) => (r) => {
      o.modify((v) => {
        v.results[i] = r;
        return v;
      });
      return r;
    },
    merge: (o) => {
      let v = o.get();
      let vra = [];
      for (let i = 0; i < Object.keys(v.results).length; i++)
        vra.push(v.results[i]);
      let va = vra.map((a) => isResultOk(a) ? resultToValue(a) : resultToBox(a, void 0));
      return vra.filter((a) => isResultErr(a)).length === vra.length ? result.Err(va) : result.Ok(va);
    },
    mergeOk: (o) => {
      let v = o.get();
      let vra = [];
      for (let i = 0; i < Object.keys(v.results).length; i++)
        vra.push(v.results[i]);
      let va = vra.map((a) => isResultOk(a) ? resultToValue(a) : void 0).filter((a) => a !== void 0);
      return va.length === 0 ? result.Err(vra.map((a) => resultToValue(a))) : result.Ok(va);
    }
  }).set({
    results: {},
    total,
    queues
  });
  let onceHandoff = once(handoff);
  let fn = curry3(
    (index) => composeF(
      curry3((next, a) => {
        results.takeOne(fn);
        next(a);
      }),
      traverseResolve(method, cancels, results, index, onceHandoff),
      runBoxOk(cancels.push, unit, get("state")),
      // run box ok
      resolvePromiseOk(travFn),
      curry3((next, a) => next(result.Ok(a))),
      logF("trav run step 1")
    )
  );
  if (mode === Box.TraverseSeries)
    results.takeOne(fn);
  else
    results.takeAll(fn);
});
var resolveFirst = curry3((called, state, cancel, resolve, next, res) => {
  if (called.get() !== "called") {
    called.set("called");
    handoffToResolve(state.get, resolve, next, res);
    cancel();
  }
});
var maybeToBox = curry3((err, maybe) => {
  if (isFunction4(maybe)) {
    return (x) => {
      const m = maybe(x);
      if (!isSameType(Maybe, m))
        throw new TypeError("maybeToBox: Maybe or Maybe returning function required");
      return m.either(constant2(Box.Err(err)), Box.Ok);
    };
  }
  if (!isSameType(Maybe, maybe))
    throw new TypeError("maybeToBox: Maybe or Maybe returning function required");
  return maybe.either(constant2(Box.Err(err)), Box.Ok);
});
var ResultToBox = curry3((result2) => {
  if (isFunction4(result2)) {
    return (x) => {
      const m = result2(x);
      if (!isSameType(import_crocks4.default.Result, m))
        throw new TypeError("ResultToBox: Result or Result returning function required");
      return m.either(Box.Err, Box.Ok);
    };
  }
  if (!isSameType(import_crocks4.default.Result, result2))
    throw new TypeError("ResultToBox: Result or Result returning function required");
  return result2.either(Box.Err, Box.Ok);
});
var gid = 1;
function Box(fn, u, st) {
  var of = _of2;
  var exp = {
    id: gid++,
    cancel: null,
    abortController: new AbortController()
  };
  if (!isFunction4(fn)) {
    st = u;
    u = fn;
    return Box.of(u, st);
  }
  var x = u === void 0 ? symNoData : !result.includes(u) ? result.Ok(u) : u;
  var _state = st === void 0 ? symNoData : st;
  function either(f, g) {
    let caseOf2 = _either(f, g);
    return x === symNoData ? caseOf2 : constant2(caseOf2(x));
  }
  var inspect3 = function() {
    let f = either(
      (l) => "Err" + inspect(l),
      (r) => "Ok" + inspect(r)
    );
    return `Box ` + (isFnType("_constant", f) ? f() : inspect(fn)) + (_state !== symNoData ? ` state: ${_state}` : "");
  };
  var extract = function() {
    let f = either(
      (l) => "Err:" + l,
      (r) => r
    );
    if (isFnType("_constant", f))
      return f();
    return symNoData;
  };
  const toPair = () => Pair(x === symNoData ? result.Err(null) : x, _state === symNoData ? void 0 : _state);
  const toResult = () => x === symNoData ? result.Err(null) : x;
  const toValue = () => x;
  const toState = () => _state;
  function runWith(resolve, state) {
    if (!isFunction4(resolve)) {
      Box.debug === false || console.log(`resolve: ${resolve}`);
      throw new TypeError("Box.run: function required for `resolve`");
    }
    let cancelled = false;
    const _cancel = () => {
      cancelled = true;
      exp.abortController.abort("cancelled");
      Box.debug === false || console.log(`cancel Box:${exp.id}`);
    };
    const settle = (f, x2) => {
      if (cancelled)
        return unit();
      return f(x2);
    };
    Box.debug === false || console.log(`run Box:(${exp.id}) fn:${fn.nm} resolve:${resolve.nm} state:${state} cancelled:${cancelled}`);
    const internal = fn(settle.bind(null, resolve), state);
    const internalFn = isFunction4(internal) ? internal : unit;
    exp.cancel = once(() => _cancel(internalFn()));
    return exp.cancel;
  }
  function map(mapFn) {
    if (!isFunction4(mapFn))
      throw new TypeError("Box.map: Parameter must be function");
    return Box((resolve, state) => {
      let { get, set } = Store();
      return runWith(
        composeF(
          handoffToResolve(get("state"), resolve),
          resolvePromiseOk(mapFn),
          startChain(set("result"), set("state"))
        ),
        state
      );
    });
  }
  function bimap2(errFn, okFn) {
    if (!isFunction4(errFn) || !isFunction4(okFn))
      throw new TypeError("Box.bimap: Both parameters must be functions ");
    return Box((resolve, state) => {
      let { get, set } = Store();
      return runWith(
        composeF(
          handoffToResolve(get("state"), resolve),
          resolvePromiseEither(errFn, okFn),
          startChain(set("result"), set("state"))
        ),
        state
      );
    });
  }
  function alt(m) {
    let altFn = m;
    if (!isFunction4(altFn) && !Box.isBox(m))
      throw new TypeError("Box.alt: Parameter must either be a Box or a function returning Box ");
    return Box((resolve, state) => {
      let { get, set } = Store();
      set("innerCancel", unit);
      let cancel = runWith(
        composeF(
          handoffToResolve(get("state"), resolve),
          eitherAlt(get("result")),
          runBoxErr(set("innerCancel"), set("state"), get("state")),
          callAltFn(altFn),
          startChain(set("result"), set("state"))
        ),
        state
      );
      return once(() => cancel(get("innerCancel")()));
    });
  }
  function chain(chainFn) {
    if (!isFunction4(chainFn))
      throw new TypeError("Box.chain: Parameter must be function");
    return Box((resolve, state) => {
      let { get, set } = Store();
      set("innnerCancel", unit);
      let cancel = runWith(
        composeF(
          handoffToResolve(get("state"), resolve),
          runBoxOk(set("innerCancel"), set("state"), get("state")),
          resolvePromiseOk(chainFn),
          startChain(set("result"), set("state"))
        ),
        state
      );
      return once(() => cancel(get("innerCancel")()));
    });
  }
  function chainSetPath(path, chainFn) {
    return chain((args) => chainFn().map((x2) => setPath(path, constant2(x2), args)));
  }
  function bichain(errFn, okFn) {
    if (!isFunction4(errFn) || !isFunction4(okFn))
      throw new TypeError("Box.bichain: Both params must be functions ");
    return Box((resolve, state) => {
      let { get, set } = Store();
      set("innnerCancel", unit);
      let cancel = runWith(
        composeF(
          handoffToResolve(get("state"), resolve),
          runBoxEither(set("innerCancel"), set("state"), get("state")),
          resolvePromiseEither(errFn, okFn),
          startChain(set("result"), set("state"))
        ),
        state
      );
      return once(() => cancel(get("innerCancel")()));
    });
  }
  function chainAll(chainFns) {
    if (!isArray3(chainFns) || chainFns.filter((fn2) => !isFunction4(fn2)).length)
      throw new TypeError(`Box.chainAll: Param should be an array of functions --${chainFns}--`);
    if (chainFns.length === 0)
      return chain((x2) => Box(x2));
    return chainFns.reduce((box, chainFn) => box && box.chain ? box.chain(chainFn) : chain(chainFn), null);
  }
  function mapAll(mapFns) {
    if (!isArray3(mapFns) || mapFns.filter((fn2) => !isFunction4(fn2)).length)
      throw new TypeError("Box.mapAll: Param should be an array of functions");
    if (mapFns.length === 0)
      return map((x2) => x2);
    return mapFns.reduce((box, mapFn) => box && map.chain ? box.map(mapFn) : map(mapFn), null);
  }
  function ap(m) {
    let apFn = m;
    if (!isFunction4(apFn) && !Box.isBox(m))
      throw new TypeError("Box.ap: Parameter must either be a Box or a function returning Box");
    return Box((resolve, state) => {
      let { get, set } = Store();
      set("innerCancel", unit);
      let cancel = runWith(
        composeF(
          handoffToResolve(get("state"), resolve),
          runApFunc(get("result")),
          runBoxOk(set("innerCancel"), set("state"), get("state")),
          callFnOrBox(apFn),
          verifyAp,
          startChain(set("result"), set("state"))
        ),
        state
      );
      return once(() => cancel(get("innerCancel")()));
    });
  }
  function race(m) {
    let raceFn = m;
    if (!isFunction4(raceFn) && !Box.isBox(m))
      throw new TypeError("Box.race: Parameter must either be a Box or a function returning Box");
    return Box((resolve, state) => {
      let { get, set, keyf } = Store();
      let _state2 = keyf("state");
      let called = keyf("called");
      let innerCancel = keyf("innerCancel").set(unit);
      let cancel = runWith(
        composeF(resolveFirst(called, _state2, innerCancel.get(), resolve), startChain(set("result"), set("state"))),
        state
      );
      composeF(
        resolveFirst(called, _state2, cancel, resolve),
        runBoxOk(set("innerCancel"), set("state2"), get("state")),
        callFnOrBox(raceFn)
      )(result.Ok(void 0));
      return once(() => cancel(innerCancel.get()));
    });
  }
  function traverse(travFn, method = Box.TraverseAll, mode = Box.TraverseParallel) {
    if (!isFunction4(travFn))
      throw new TypeError("Box.traverse: Parameter must be a function returning Box");
    if (!(method === Box.TraverseAll || method === Box.TraverseAllOk || method === Box.TraverseAllSettled || method === Box.TraverseAny || method === Box.TraverseRace))
      throw new TypeError("Box.traverse: method needs to be All | AllSettled | AllOk | Any | Race");
    if (!(mode === Box.TraverseSeries || mode === Box.TraverseParallel))
      throw new TypeError("Box.traverse: mode needs to be Series | Parallel");
    return Box((resolve, state) => {
      let { get, set, keyf } = Store();
      let cancels = keyf("cancels", {
        push: (o, c) => {
          o.modify((v) => {
            v.values.push(c);
            return v;
          });
        },
        merge: (o) => {
          let v = o.get().values;
          if (isArray3(v) && v.length)
            composeA(v)();
        }
      }).set({
        values: []
      });
      let cancel = runWith(
        composeF(
          handoffToResolve(get("state"), once(resolve)),
          logF("traverse step 3"),
          traverseRun(travFn, cancels, method, mode),
          logF("traverse step 2"),
          startChain(set("result"), set("state")),
          logF("traverse step 1")
        ),
        state
      );
      cancels.push(cancel);
      return cancels.merge;
    });
  }
  function traverseAllParallel(travFn) {
    return traverse(travFn, Box.TraverseAll, Box.TraverseParallel);
  }
  function traverseAllSeries(travFn) {
    return traverse(travFn, Box.TraverseAll, Box.TraverseSeries);
  }
  function traverseAnyParallel(travFn) {
    return traverse(travFn, Box.TraverseAny, Box.TraverseParallel);
  }
  function traverseAnySeries(travFn) {
    return traverse(travFn, Box.TraverseAny, Box.TraverseSeries);
  }
  function traverseAllSettledParallel(travFn) {
    return traverse(travFn, Box.TraverseAllSettled, Box.TraverseParallel);
  }
  function traverseAllSettledSeries(travFn) {
    return traverse(travFn, Box.TraverseAllSettled, Box.TraverseSeries);
  }
  function traverseAllOkParallel(travFn) {
    return traverse(travFn, Box.TraverseAllOk, Box.TraverseParallel);
  }
  function traverseAllOkSeries(travFn) {
    return traverse(travFn, Box.TraverseAllOk, Box.TraverseSeries);
  }
  function traverseRace(travFn) {
    return traverse(travFn, Box.TraverseRace, Box.TraverseParallel);
  }
  function runPromise(s, to = Box.pairToBox) {
    return new Promise((resolve) => {
      const rmEvList = (x2) => {
        exp.abortController.signal.removeEventListener("abort", abortListener);
        return x2;
      };
      resolve.nm = "promresolve";
      let cancel = unit;
      cancel = runWith(compose(cancel, rmEvList, resolve, log("runp step 2"), to, log("runp inp")), s);
      const abortListener = ({ target }) => {
        rmEvList();
        resolve(Pair(result.Err(target.reason), void 0));
      };
      exp.abortController.signal.addEventListener("abort", abortListener);
    });
  }
  function run(resolve, s, to = Box.pairToBox) {
    if (!isFunction4(resolve))
      throw new TypeError("Box.run: Function required");
    return runWith(compose(resolve, log("run step 2"), to || Box.pairToBox, log("run inp")), s);
  }
  return {
    of,
    ap,
    exp,
    either,
    extract,
    run,
    map,
    bimap: bimap2,
    alt,
    chain,
    chainSetPath,
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
    inspect: inspect3,
    type,
    toString: inspect3,
    toPair,
    toResult,
    toValue,
    toState,
    constructor: Box
  };
}
Box.of = _of2;
Box.type = type;
var pairToBox = unary(
  compose(converge(binary(Box.of), fst, snd), unless(isSameType(Pair), throwError("pairToBox: Pair needed")))
);
Box.getState = getState;
Box.modifyState = curry3(modifyState);
Box.Pair = Pair;
Box.Err = compose(Box, result.Err);
Box.Ok = compose(Box, result.Ok);
Box.pairToResult = pairToResult;
Box.pairToArray = pairToArray;
Box.pairToBox = pairToBox;
Box.pairToPair = identity;
Box.pairToState = pairToState;
Box.pairToValue = pairToValue;
Box.toPair = unary(compose((box) => box.toPair(), unless(and(isBox, inBoxMode), throwError("Box.toPair Box needed"))));
Box.toResult = unary(
  compose((box) => box.toResult(), unless(and(isBox, inBoxMode), throwError("Box.toResult Box needed")))
);
Box.toValue = unary(
  compose((box) => box.toValue(), unless(and(isBox, inBoxMode), throwError("Box.toValue Box needed")))
);
Box.toState = unary(
  compose((box) => box.toState(), unless(and(isBox, inBoxMode), throwError("Box.toState Box needed")))
);
Box.buildPair = binary((x, s) => Pair(result.Ok(x), s));
Box.fromPromise = fromPromise;
Box.fromPromiseLazy = fromPromiseLazy;
Box.rejectAfter = rejectAfter;
Box.resolveAfter = resolveAfter;
Box.waitUntil = waitUntil;
Box.isBox = isBox;
Box.debug = false;
Box.result = result;
Box.tee = compose(snd, bimap(log, identity), branch);
Box.log = (x) => console.log(`log:- ${x.inspect ? x.inspect() : x}`);
Box.delay = curry3(Box.resolveAfter);
Box.TraverseAll = "All";
Box.TraverseAllSettled = "AllSettled";
Box.TraverseAllOk = "AllOk";
Box.TraverseAny = "Any";
Box.TraverseRace = "Race";
Box.TraverseSeries = "Series";
Box.TraverseParallel = "Parallel";
Box.maybeToBox = maybeToBox;
Box.ResultToBox = ResultToBox;
Box.isResult = isResult;
Box.isResultOk = isResultOk;
Box.isResultErr = isResultErr;
Box.isOk = compose(isResultOk, Box.toResult);
Box.isErr = compose(isResultErr, Box.toResult);
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
  Store
};
Box.sym = {
  symErr,
  symNoData
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Box,
  Store
});
/** @license ISC License (c) copyright 2016 original and current authors */
/** @license ISC License (c) copyright 2023 */
/** @license GNU Public License V3 (c) copyright 2024 */
