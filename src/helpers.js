// import * as R from "ramda"
import * as C from "crocks"
/* copied from crocks/core/curryN.js
 * Modified curryN, so that we allow optional parameters with default values towards the end
 *
 * so const f1 = curryN(2, (a, b, c=1) => { ... })
 *
 * can be called as    f1(1, 2) and c will be defaulted to 1
 * or can be called as f1(1, 2, 3) and c will get a value of 3
 */
export function curryN(n, fn) {
  /** @license ISC License (c) copyright 2017 original and current authors */
  /** @author Ian Hofmann-Hicks (evil) */
  /** Modified by Moorthy RS rsmoorthy@gmail.com **/

  return function () {
    var xs = [],
      len = arguments.length
    while (len--) xs[len] = arguments[len]

    var args = xs.length ? xs : [undefined]

    var remaining = Math.floor(n) - args.length

    return remaining > 0
      ? curryN(remaining, Function.bind.apply(fn, [null].concat(args)))
      : fn.apply(null, args.slice(0)) // pass all the arguments, so that we allow optional parameters
    // : fn.apply(null, args.slice(0, n))
  }
}
/* curryF - This is curryN Modified, so that we allow optional parameters with default values at any position
 * with the condition that the type/value of mandatory parameters is distinct from the
 * optional parameters
 *
 * so const f1 = curryF([fn, null, fn], (a, b=1, c) => { ... })
 *
 * where the first argument is an array of functions corresponding to the mandatory parameters
 * and in the position of optional parameters, null can be specified
 * and hence the length of this array is equivalent to curryN(n...
 *
 * so const f1 = curryF( [isString, null, isObject], (a, b=1, c) => { .... })
 * can be called as    f1("string", 2) will return a curried function, which when called with {hello: 1}, you
 *                           get a="string" b=2, c={hello: 1}
 * when   called as    f1("string", {hello:1}) will call the function, so you get
 *                           get a="string" b=1 (the default), c={hello: 1}
 *
 * curryF will ignore type checking if an incorrect type/value is provided for the mandatory parameters
 * so calling f1(12, 2) will return a curried function, even though 12 is not matching isString
 */
export function curryF(nfn, fn) {
  /** @license ISC License (c) copyright 2017 original and current authors */
  /** @author Ian Hofmann-Hicks (evil) */
  /** Modified by Moorthy RS rsmoorthy@gmail.com **/

  if (!C.isArray(nfn)) throw new TypeError("curryF first parameter should be array of functions/null")

  const getNextMatch = (nfn, k, x) =>
    nfn.slice(k).reduce((acc, v, i) => (acc === null && v !== null && C.isFunction(v) && v(x) ? k + i : null), null)
  /*
    console.log("getNextMatch", "nfn:", nfn.length, nfn, "k:", k, "typeof(x):", typeof x, "ret", ret)
    for (; k < nfn.length; k++) {
      if (nfn[k] == null) continue
      let fn = nfn[k]
      if (fn.call(null, x)) return k
      return null
    }
    return null
  */

  /*
   * i=0; j=0; i < xs.len; i++, j++
   * 1. if j > nfn.length or nfn[j] != null, then pass the arg xs[i] as is. Go to next i, j
   * 2. if nfn[j] == null
   *     if xs[i] === to match with next nfn[k] (where k > j)
   *        add xs[i..k-j] to undefined, then xs[j] = xs[i]
   *        advance nfn to k++, add xs to i++
   *     else
   *        advance nfn j++ and xs to i++
   */

  return function () {
    var _xs = [],
      xs = [],
      len = arguments.length
    while (len--) _xs[len] = arguments[len]
    let j = 0
    // eslint-disable-next-line no-restricted-syntax
    for (let i = 0; i < _xs.length; i++, j++) {
      if (j >= nfn.length || nfn[j] !== null) {
        xs.push(_xs[i])
        continue
      } else if (nfn[j] === null) {
        let k = getNextMatch(nfn, j + 1, _xs[i])
        if (k) {
          for (let a = 0; a < k - j; a++) xs.push(undefined)
          j = k
        }
        xs.push(_xs[i])
      }
    }

    var args = xs.length ? xs : [undefined]

    var remaining = nfn.slice(j)

    return remaining.length > 0
      ? curryF(remaining, Function.bind.apply(fn, [null].concat(args)))
      : fn.apply(null, args.slice(0)) // pass all the arguments, so that we allow optional parameters at the end
  }
}
