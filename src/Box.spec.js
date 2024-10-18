/* eslint-disable node/no-unpublished-import  */

import test from "tape"

import sinon from "sinon"

import { Box } from "./Box.js"

import { default as crocks } from "crocks"

const { Maybe, identity, isFunction, isPromise, isObject, compose, unit, curry } = crocks

const { isBox } = Box

const slice = (x) => Array.prototype.slice.call(x)

const add1 = (x) => x + 1
const add1Async = async (x) => x + 1
const chainAdd1 = (x) => Box(x + 1)
const delay = (ms) => (x) => new Promise((resolve) => setTimeout(() => resolve(x), ms))
const chainAdd1Async = async (x) => Box(x + 1)
const log = (x) => {
  console.log(`log:: ${x.inspect ? x.inspect() : x}`)
  return x
}
// eslint-disable-next-line no-unused-vars
const tee = (fn) => compose(log, fn, log)
const chainDelay = (ms) => (x) => new Promise((resolve) => setTimeout(() => resolve(Box(x)), ms))

function bindFunc(fn) {
  return function () {
    return Function.bind.apply(fn, [null].concat(slice(arguments)))
  }
}

test("Box", function (t) {
  const m = Box(1)

  t.ok(isFunction(Box), "is a function")
  t.ok(isObject(m), "is a object")
  t.ok(isBox(m), "is a Box type")

  t.ok(isFunction(Box.of), "provides a of function")
  t.ok(isFunction(Box.type), "provides a type function")

  t.equals(Box.Ok(3).constructor, Box, "provides a TypeRep on constructor on Ok")
  t.equals(Box.Err(3).constructor, Box, "provides a TypeRep on constructor on Err")

  t.ok(isFunction(Box.Ok), "provides a Ok function")
  t.ok(isFunction(Box.Err), "provides a Err function")

  t.end()
})

test("Box run errors", function (t) {
  const m = Box(1)
  const run = bindFunc(m.run)

  const err = /Function required|Functions required/
  t.throws(Box(1).run, err, "Throws an error when no resovle function is provided")
  t.throws(run(), err, "Throws an error when no resovle function is provided")
  t.throws(run(undefined), err, "Throws an error when no resovle function is provided")
  t.throws(run({}), err, "Throws an error when no resovle function is provided")

  t.end()
})

test("Box map tests", function (t) {
  const eqobjs = [{ m: Box(1).map(add1).run, val: Box(2) }]
  let verify = (y) => (x) => t.equal(x.inspect(), y.inspect(), "map correct value")

  t.plan(eqobjs.length)
  eqobjs.map((o) => o.m(verify(o.val)))
})

test("Box map async tests", function (t) {
  const eqobjs = [{ m: Box(1).map(add1Async).run, val: Box(2) }]
  let verify = (y) => (x) => t.equal(x.inspect(), y.inspect(), "async map correct value")

  t.plan(eqobjs.length)
  eqobjs.map((o) => o.m(verify(o.val)))
})

test("Box chain tests", function (t) {
  const add1 = (x) => Box(x + 1)
  const eqobjs = [{ m: Box(1).chain(add1).run, val: Box(2) }]
  let verify = (y) => (x) => t.equal(x.inspect(), y.inspect(), "chain correct value")

  t.plan(eqobjs.length)

  eqobjs.map((o) => o.m(verify(o.val)))
})

test("Box chain async tests", function (t) {
  const eqobjs = [
    { m: Box(1).chain(chainAdd1Async).run, val: Box(2) },
    {
      m: Box(1).chain(chainAdd1Async).chain(chainDelay(100)).run,
      val: Box(2),
    },
    {
      m: Box(1).map(add1Async).chain(chainAdd1Async).chain(chainDelay(100)).run,
      val: Box(3),
    },
  ]
  let verify = (y) => (x) => t.equal(x.inspect(), y.inspect(), "async chain correct value")

  t.plan(eqobjs.length)

  eqobjs.map((o) => o.m(verify(o.val)))
})

test("Box result error processing", function (t) {
  t.plan(2)
  const m = Box.Err(1).map(add1).chain(chainDelay(5000)).run

  t.ok(isFunction(m), "Box err run is a function")

  var token = setTimeout(() => t.fail("Box Err is processing chain function"), 200)

  let verify = (y) => (x) => {
    t.equal(x.inspect(), y.inspect(), "result err value is correct")
    clearTimeout(token)
  }

  m(verify(Box.Err(1)))
})

test("Box chain cancel test", function (t) {
  t.plan(2)
  var res = sinon.spy(() => t.fail("resolve called after cancel"))

  var _add1 = sinon.spy(add1)
  const m = Box.Ok(1).chain(chainDelay(300)).map(_add1)

  var cancel = m.run(res)

  cancel()

  setTimeout(() => {
    t.notOk(res.called, "resolve is never called")
    t.notOk(_add1.called, "map function add1 is never called")
  }, 400)
})

test("Box resolveAfter", function (t) {
  t.plan(2)

  const value = "value"

  t.ok(isFunction(Box.resolveAfter), "provides a resolveAfter function")

  Box.resolveAfter(0, value).run((x) => t.equals(x.inspect(), Box.Ok(value).inspect(), "resolves with value"))
})

test("Box rejectAfter", function (t) {
  t.plan(2)

  const value = "value"

  t.ok(isFunction(Box.rejectAfter), "provides a rejectAfter function")

  Box.rejectAfter(0, value).run((x) => t.equals(x.inspect(), Box.Err(value).inspect(), "rejects with error"))
})

test("Box run return values", function (t) {
  t.plan(6)

  const m = Box(1).map(add1).chain(chainAdd1)

  m.run((x) => t.equals(x.inspect(), Box(3, 5).inspect(), "returns Box type"), 5, Box.pairToBox)
  m.run((x) => t.equals(x.inspect(), Box.result.Ok(3).inspect(), "returns Result type"), 5, Box.pairToResult)
  m.run((x) => t.equals(x.inspect(), Box.Pair(Box.result.Ok(3), 5).inspect(), "returns Pair type"), 5, Box.pairToPair)
  m.run((x) => t.equals(x, 3, "returns value type"), 5, Box.pairToValue)
  m.run((x) => t.equals(x, 5, "returns state type"), 5, Box.pairToState)
  m.run((x) => t.same(x, [null, 3], "returns array type"), 5, Box.pairToArray)
})

test("Box run return promise", function (t) {
  t.plan(4)
  const m = Box(1).map(add1Async).chain(chainAdd1Async)

  let promise = m.runPromise()
  t.ok(isPromise(promise), "Returns a promise")

  promise.then(
    (x) => t.equals(x.inspect(), Box(3).inspect(), "Promise value returns a Box"),
    () => t.fail("Promise throws an error")
  )

  let promise2 = m.runPromise(5, Box.pairToArray)
  t.ok(isPromise(promise2), "Returns a promise")

  promise2.then(
    (x) => t.same(x, [null, 3], "Promise value returns a Array of result"),
    () => t.fail("Promise throws an error")
  )
})

test("Box fromPromise", async function (t) {
  t.plan(5)
  t.ok(isFunction(Box.fromPromise), "fromPromise is a valid function in the constructor")

  var del = sinon.spy(delay(300))
  var start = sinon.spy()
  const a = Box.fromPromise(del)
  t.ok(isFunction(a), "fromPromise returns a function")
  const b = a(1)
  t.equals(b.inspect(), Box(unit).inspect(), "calling fromPromise function returns a Box Function")

  await delay(50)()

  start()

  let x = await b.runPromise()
  t.equals(x.inspect(), Box(1).inspect(), "fromPromise returns a Box")
  t.ok(del.calledBefore(start), "fromPromise function is called before it is run")
})

test("Box fromPromiseLazy", async function (t) {
  t.plan(5)
  t.ok(isFunction(Box.fromPromiseLazy), "fromPromiseLazy is a valid function in the constructor")

  var del = sinon.spy(delay(300))
  var start = sinon.spy()
  const a = Box.fromPromiseLazy(del)
  t.ok(isFunction(a), "fromPromiseLazy returns a function")
  const b = a(1)
  t.equals(b.inspect(), Box(unit).inspect(), "calling fromPromiseLazy function returns a Box Function")

  await delay(50)()

  start()

  let x = await b.runPromise()
  t.equals(x.inspect(), Box(1).inspect(), "fromPromiseLazy returns a Box with a value")
  t.ok(del.calledAfter(start), "fromPromiseLazy function is called after it is run")
})

test("Box getState", function (t) {
  t.plan(2)

  let state = 5
  t.ok(isFunction(Box.getState), "getState is a valid function in the constructor")
  const m = Box(1).chain(() => Box.getState().map((s) => s))

  m.run((x) => t.equals(x.inspect(), Box(state, state).inspect(), "State value is obtained from getState"), state)
})

test("Box modifyState", function (t) {
  t.plan(2)

  let state = 5
  t.ok(isFunction(Box.modifyState), "modifyState is a valid function in the constructor")
  const m = Box(1).chain(Box.modifyState((s) => s + 1))

  m.run((x) => t.equals(x.inspect(), Box(1, state + 1).inspect(), "State value is modified via modifyState"), state)
})

test("Box map properties (Functor)", function (t) {
  const f = (x) => x + 2
  const g = (x) => x * 2

  t.ok(isFunction(Box(unit).map), "provides a map function")

  const x = 30
  const id = sinon.spy()

  Box(x).map(identity).run(id, undefined, Box.pairToValue)

  const y = 10
  const left = sinon.spy()
  const right = sinon.spy()

  Box(y).map(compose(f, g)).run(left, undefined, Box.pairToValue)
  Box(y).map(g).map(f).run(right, undefined, Box.pairToValue)

  t.ok(id.calledWith(x), "identity")
  t.same(left.args[0], right.args[0], "composition")

  t.end()
})

test("Box bimap functionality", function (t) {
  const add1 = (x) => x + 1
  const add1Err = sinon.spy(add1)
  const add1Ok = sinon.spy(add1)

  const valErr = sinon.spy()
  const valOk = sinon.spy()

  const err = /must be function/
  t.throws(() => Box(1).bimap(), err, "bimap no args should throw")
  t.throws(() => Box(1).bimap(null, 5), err, "bimap non-functions should throw")
  t.throws(() => Box(1).bimap((x) => x + 1, "str"), err, "bimap non-func should throw")

  Box.Ok(1).bimap(add1Err, add1Ok).run(valOk, undefined, Box.pairToValue)
  Box.Err(5).bimap(add1Err, add1Ok).run(valErr, undefined, Box.pairToArray)

  t.ok(add1Err.calledOnce, "Map error function called once")
  t.ok(add1Ok.calledOnce, "Map ok function called once")

  t.same(valErr.args[0][0], [6, null], "Error value correct")
  t.same(valOk.args[0][0], 2, "Ok value correct")

  t.end()
})

test("Box bichain functionality", function (t) {
  const add1 = (x) => Box(x + 1)
  const add1Err = sinon.spy(add1)
  const add1Ok = sinon.spy(add1)

  const valErr = sinon.spy()
  const valOk = sinon.spy()

  const err = /must be function/
  t.throws(() => Box(1).bichain(), err, "bichain no args should throw")
  t.throws(() => Box(1).bichain(null, 5), err, "bichain non-functions should throw")
  t.throws(() => Box(1).bichain((x) => x + 1, "str"), err, "bichain non-func should throw")

  Box.Ok(1).bichain(add1Err, add1Ok).run(valOk, undefined, Box.pairToValue)
  Box.Err(5).bichain(add1Err, add1Ok).run(valErr, undefined, Box.pairToArray)

  t.ok(add1Err.calledOnce, "Chain error function called once")
  t.ok(add1Ok.calledOnce, "Chain ok function called once")

  t.same(valErr.args[0][0], [6, null], "Error value correct")
  t.same(valOk.args[0][0], 2, "Ok value correct")

  t.end()
})

test("Box alt functionality", function (t) {
  t.plan(11)
  const err = /must either be a Box or a function/
  t.throws(() => Box(1).alt(), err, "alt no args should throw")
  t.throws(() => Box(1).alt(null), err, "alt non-func | Box should throw")
  t.throws(() => Box(1).alt("str"), err, "alt non-func | Box should throw")

  let verify = curry((msg, y, x) => t.equals(x.inspect ? x.inspect() : x, y.inspect ? y.inspect() : y, msg))

  // Alt wont run
  Box.Ok(1)
    .alt(Box(2))
    .run(verify("alt both Ok", Box(1)))

  // Alt wont run
  Box.Ok(1)
    .alt((x) => Box(x + 1))
    .run(verify("alt Both Ok, but with a function", Box(1)))

  // Alt wont run even if the function is wrong
  Box.Ok(1)
    .alt((x) => x + 1)
    .run(verify("alt both ok, but with a function that does not return a box", Box(1)))

  // Alt wont run
  Box.Ok(1)
    .alt(Box.Err(2))
    .run(verify("alt initial ok, later error, so wont run", Box(1)))

  // Alt will run
  Box.Err(1)
    .alt(Box.Ok(5))
    .run(verify("alt Err, supplemented with Ok. Will run", Box(5)))

  // Alt will run with Fn
  Box.Err(1)
    .alt((x) => Box.Ok(x + 5))
    .run(verify("alt Err, supplemented with Ok (Function). Will run", Box(6)))

  // Alt will run with both errs
  Box.Err(1)
    .alt(Box.Err(2))
    .run(verify("alt Err, supplemented with another Error, will run", Box.Err(2)))

  // Alt will run with both errs, by passing a function
  Box.Err(1)
    .alt(async (x) => Box.Err(x + 1))
    .run(verify("alt Err, supplemented with another Error (Function), will run", Box.Err(2)))
})

test("Box ap functionality", function (t) {
  t.plan(10)
  const add1 = (x) => x + 1
  const add = (x) => (y) => x + y
  const err = /must either be a Box or a function|must be a function/
  t.throws(() => Box.Ok(add1).ap(), err, "ap no args should throw")
  t.throws(() => Box.Ok(add1).ap(null), err, "ap non-func | Box should throw")
  t.throws(() => Box.Ok(add1).ap("str"), err, "ap non-func | Box should throw")
  t.throws(() => Box.Ok(1).ap(Box(1)).run(Box.log), err, "ap original Box must be a function")

  let verify = curry((msg, y, x) => t.equals(x.inspect ? x.inspect() : x, y.inspect ? y.inspect() : y, msg))

  // Ap regular usage
  Box.Ok(add1)
    .ap(Box(2))
    .run(verify("ap regular usage", Box(3)))

  // Ap should not run
  Box.Err(1)
    .ap(Box.Ok(add1))
    .run(verify("ap error, should ignore function being sent in", Box.Err(1)))

  // Ap should run, when we pass a function, that returns a Box
  Box.Ok(add1)
    .ap(() => Box(1))
    .run(verify("ap should run when we pass a function", Box(2)))

  // Ap should run, when we pass a async function, that returns a Box
  Box.Ok(add1)
    .ap(async () => Box(1))
    .run(verify("ap should run when we pass a async function", Box(2)))

  // Ap should run, when we pass chained APs
  Box.Ok(add)
    .ap(async () => Box(1))
    .ap(async () => Box(2))
    .run(verify("ap should run when we pass chained APs", Box(3)))

  // Ap should throw Error, when we pass chained APs, but they are not function anymore
  t.throws(() => Box.Ok(add1).ap(Box(1)).ap(Box(2)).run(Box.log), err, "ap chained Box must be a function")
})

test("Box race functionality", function (t) {
  t.plan(8)
  const err = /must either be a Box or a function|must be a function/
  t.throws(() => Box(1).race(), err, "race no args should throw")
  t.throws(() => Box(1).race(null), err, "race non-func | Box should throw")
  t.throws(() => Box(1).race("str"), err, "race non-func | Box should throw")

  let verify = curry((msg, y, x) => t.equals(x.inspect ? x.inspect() : x, y.inspect ? y.inspect() : y, msg))

  // Race with rejectAfter
  Box.Ok(1)
    .chain(chainDelay(300))
    .race(Box.rejectAfter(100, "timed out"))
    .run(verify("race should reject before", Box.Err("timed out")))

  // Main box chain before rejectAfter
  Box.Ok(1)
    .chain(chainDelay(100))
    .race(Box.rejectAfter(300, "timed out"))
    .run(verify("race should resolve ok", Box.Ok(1)))

  // adding resolveAfter well before main chain
  Box.Ok(1)
    .chain(chainDelay(300))
    .race(Box.resolveAfter(100, 5))
    .run(verify("race should resolve ok", Box.Ok(5)))

  // adding resolveAfter after main chain
  Box.Ok(1)
    .chain(chainDelay(100))
    .race(Box.resolveAfter(200, 5))
    .run(verify("race should resolve ok", Box.Ok(1)))

  // adding resolveAfter after main chain of Err
  Box.Err(1)
    .chain(chainDelay(100))
    .race(Box.resolveAfter(200, 5))
    .run(verify("race should not do chain/race", Box.Err(1)))
})

test("Box traverse functionality", function (t) {
  t.plan(41)
  const err = /must be a function|method needs to be|mode needs to be|Need to return type Box/
  t.throws(() => Box(1).traverse(), err, "traverse function should be provided")
  t.throws(() => Box(1).traverse(unit, null), err, "traverse method should be okay")
  t.throws(() => Box(1).traverse(unit, Box.TraverseAll, "str"), err, "traverse mode should be okay")
  t.throws(() => Box(1).traverse(unit).run(Box.log), err, "traverse function should return Box")

  let verify = curry((msg, y, x) => t.equals(x.inspect ? x.inspect() : x, y.inspect ? y.inspect() : y, msg))
  let delay = (ms) => (x) => new Promise((resolve) => setTimeout(() => resolve(Box(x)), ms))

  let diff = 20

  // traverse non-array value converted
  Box.Ok(1)
    .traverse((x) => Box.Ok(x + 1))
    .run(verify("traverse should resolve ok", Box.Ok([2])))

  // traverse async non-array value converted
  Box.Ok(1)
    .traverse(async (x) => Box.Ok(x + 1))
    .run(verify("traverse async should resolve ok", Box.Ok([2])))

  // traverse array value ok
  Box.Ok([1, 2])
    .traverse((x) => Box.Ok(x + 1))
    .run(verify("traverse array value ok", Box.Ok([2, 3])))

  // traverse async array value ok
  Box.Ok([1, 2])
    .traverse(async (x) => Box.Ok(x + 1))
    .run(verify("traverse async array value ok", Box.Ok([2, 3])))

  // traverse array value -- returns error
  Box.Ok([1, 2])
    .traverse(() => Box.Err("error"))
    .run(verify("traverse array value -- returns error", Box.Err("error")))

  // traverse Error value -- not even run
  let f1 = sinon.spy(() => Box.Err("error"))
  Box.Err(1)
    .traverse(f1)
    .run((x) => {
      verify("traverse error value -- not even run", Box.Err(1))(x)
      t.notOk(f1.called, "traverse function Should not be called on Err")
    })

  // traverse array value var delays return ordered
  Box.Ok([3, 2, 1])
    .traverse((x) => delay(x * 100)(x))
    .run(verify("traverse array value with variable delays return ordered", Box.Ok([3, 2, 1])))

  {
    // traverse parallel runs
    let start = Date.now()
    Box.Ok([2, 2, 3])
      .traverse(delay(100), Box.TraverseAll, Box.TraverseParallel)
      .run((x) => {
        t.ok(Date.now() - start < 110 + diff, `parallel run does not take x*times: ${Date.now() - start}`)
        verify("traverse array value match", Box.Ok([2, 2, 3]))(x)
      })
  }

  {
    // traverse series runs
    let start = Date.now()
    Box.Ok([2, 2, 3])
      .traverse(delay(100), Box.TraverseAll, Box.TraverseSeries)
      .run((x) => {
        let dur = Date.now() - start
        t.ok(dur > 300 - diff, `series run takes x*times, dur:${dur}`)
        verify("traverse array value match", Box.Ok([2, 2, 3]))(x)
      })
  }

  {
    // traverse any run parallel
    let start = Date.now()
    Box.Ok([1, 2, 3])
      .traverse((x) => (x === 3 ? delay(10)(x) : delay(100)(x)), Box.TraverseAny, Box.TraverseParallel)
      .run((x) => {
        let dur = Date.now() - start
        t.ok(dur > 10 && dur < 20 + diff, `parallel run with Any takes least amount of time: ${dur}`)
        verify("traverse any returns only one value", Box.Ok(3))(x)
      })
  }

  {
    // traverse any run series
    let start = Date.now()
    Box.Ok([1, 2, 3])
      .traverse((x) => (x === 3 ? delay(10)(x) : delay(100)(x)), Box.TraverseAny, Box.TraverseSeries)
      .run((x) => {
        let dur = Date.now() - start
        t.ok(dur > 100 - diff && dur < 110 + diff, `series run with Any takes same time for the first one, dur:${dur}`)
        verify("traverse any returns only one value", Box.Ok(1))(x)
      })
  }

  {
    // traverse any run with errors
    let start = Date.now()
    Box.Ok([1, 2, 3])
      .traverse((x) => (x !== 3 ? Box.Err(x) : Box.Ok(x)), Box.TraverseAny, Box.TraverseParallel)
      .run((x) => {
        verify("traverse any returns first ok value", Box.Ok(3))(x)
      })
  }

  {
    // traverse any run with errors
    let start = Date.now()
    Box.Ok([1, 2, 3])
      .traverse((x) => (x !== 3 ? Box.Err(x) : Box.Ok(x)), Box.TraverseAny, Box.TraverseSeries)
      .run((x) => {
        verify("traverse any returns first ok value", Box.Ok(3))(x)
      })
  }

  {
    // traverse race run series
    let start = Date.now()
    Box.Ok([1, 2, 3])
      .traverse((x) => (x !== 3 ? Box.Err(x) : Box.Ok(x)), Box.TraverseRace, Box.TraverseSeries)
      .run((x) => {
        verify("traverse race returns first settled value", Box.Err(1))(x)
      })
  }

  {
    // traverse race run parallel
    let start = Date.now()
    Box.Ok([1, 2, 3])
      .traverse((x) => (x === 3 ? Box.Ok(x) : delay(100)(x)), Box.TraverseRace, Box.TraverseParallel)
      .run((x) => {
        let dur = Date.now() - start
        t.ok(dur < 10 + diff, `parallel Race takes same time for first settled one: ${dur}`)
        verify("traverse race returns first settled value", Box.Ok(3))(x)
      })
  }

  {
    // traverse all run parallel with errors
    let start = Date.now()
    Box.Ok([1, 2, 3])
      .traverse((x) => (x === 3 ? Box.Err(x) : delay(100)(x)), Box.TraverseAll, Box.TraverseParallel)
      .run((x) => {
        let dur = Date.now() - start
        t.ok(dur < 10 + diff, `parallel All takes same time for first error one: ${dur}`)
        verify("traverse all returns first error encountered (if any)", Box.Err(3))(x)
      })
  }

  {
    // traverse all run parallel
    let start = Date.now()
    Box.Ok([1, 2, 3])
      .traverse(
        async (x) => {
          let b = await delay(100)(x)
          return b.map((x) => x + 1)
        },
        Box.TraverseAll,
        Box.TraverseParallel
      )
      .run((x) => {
        let dur = Date.now() - start
        t.ok(dur > 100 - diff && dur < 110 + diff, `parallel run with All takes same time for the max time one: ${dur}`)
        verify("traverse all returns all values", Box.Ok([2, 3, 4]))(x)
      })
  }

  {
    // traverse all run parallel with max invocations
    let start = Date.now()
    Box.Ok([1, 2, 3, 4, 5, 6])
      .traverse(
        async (x) => {
          let b = await delay(100)(x)
          return b.map((x) => x + 1)
        },
        Box.TraverseAll,
        2 // only 2 items in parallel in a given time
      )
      .run((x) => {
        let dur = Date.now() - start
        t.ok(dur > 300 - diff && dur < 330 + diff, `parallel run (max invocations = 2) with All takes same time as items/max invocations: ${dur}`)
        verify("traverse all returns all values", Box.Ok([2, 3, 4, 5, 6, 7]))(x)
      })
  }

  {
    // traverse all run parallel with max invocations
    let start = Date.now()
    Box.Ok([1, 2, 3, 4, 5])
      .traverse(
        async (x) => {
          let b = await delay(x * 10)(x)
          return b.map((x) => x + 1)
        },
        Box.TraverseAll,
        3 // only 3 items in parallel in a given time
      )
      .run((x) => {
        let dur = Date.now() - start
        t.ok(dur > 70 - diff && dur < 80 + diff, `parallel run (max invocations = 3) with All takes same time as items/max invocations: ${dur}`)
        verify("traverse all returns all values", Box.Ok([2, 3, 4, 5, 6]))(x)
      })
  }

  {
    // traverse all run parallel with max invocations verifying if the order is maintained fine
    let start = Date.now()
    Box.Ok([5, 4, 3, 2, 1])
      .traverse(
        async (x) => {
          let b = await delay(x * 10)(x)
          return b.map((x) => x + 1)
        },
        Box.TraverseAll,
        3 // only 3 items in parallel in a given time
      )
      .run((x) => {
        let dur = Date.now() - start
        t.ok(dur > 50 - diff && dur < 60 + diff, `parallel run (max invocations = 3) with All takes same time as items/max invocations ensuring order: ${dur}`)
        verify("traverse all returns all values in order", Box.Ok([6, 5, 4, 3, 2]))(x)
      })
  }

  {
    // traverse allSettled run parallel with errors
    let start = Date.now()
    Box.Ok([1, 2, 3])
      .traverse((x) => (x === 3 ? Box.Err(x) : delay(100)(x)), Box.TraverseAllSettled, Box.TraverseParallel)
      .run((x) => {
        let dur = Date.now() - start
        t.ok(dur > 100 - diff && dur < 120 + diff, `parallel run with AllSettled waits for all of them: dur:${dur}`)
        verify("traverse allSettled returns all of them", Box.Ok([1, 2, Box.Err(3)]))(x)
      })
  }

  {
    // traverse allSettled run parallel with all errors
    let start = Date.now()
    Box.Ok([1, 2, 3])
      .traverse((x) => Box.Err(x), Box.TraverseAllSettled, Box.TraverseParallel)
      .run((x) => {
        verify("traverse allSettled all errors returns Err", Box.Err([Box.Err(1), Box.Err(2), Box.Err(3)]))(x)
      })
  }

  {
    // traverse allOk run parallel with errors
    let start = Date.now()
    Box.Ok([1, 2, 3])
      .traverse((x) => (x === 3 ? Box.Err(x) : delay(100)(x)), Box.TraverseAllOk, Box.TraverseParallel)
      .run((x) => {
        let dur = Date.now() - start
        t.ok(dur > 100 - diff && dur < 120 + diff, `parallel run with AllOk waits for all of them: dur:${dur}`)
        verify("traverse allOk returns only Ok values", Box.Ok([1, 2]))(x)
      })
  }

  {

    // traverse allOk run parallel with all errors
    let start = Date.now()
    Box.Ok([1, 2, 3])
      .traverse((x) => Box.Err(x), Box.TraverseAllOk, Box.TraverseParallel)
      .run((x) => {
        verify("traverse allOk all errors returns Err", Box.Err([1, 2, 3]))(x)
      })
  }
})

test("Box maybeToBox ", function (t) {
  t.plan(9)
  const err = /Maybe returning function required/i
  t.throws(() => Box.maybeToBox("none", null), err, "maybe or maybe returning function required")
  t.throws(() => Box.maybeToBox("none", 55), err, "maybe or maybe returning function required")
  t.throws(() => Box.maybeToBox("none", "str"), err, "maybe or maybe returning function required")

  t.ok(
    isFunction(() => Box.maybeToBox("nothing", unit)),
    "maybeToBox returns a function when a function is provided"
  )

  t.throws(() => Box.maybeToBox("nothing", unit)(), err, "function should return a maybe")

  let ok = Box.maybeToBox("none", Maybe.Just("some"))
  let er = Box.maybeToBox("none", Maybe.Nothing())
  t.equals(ok.inspect(), Box.Ok("some").inspect(), "basic maybeToBox ok working")
  t.equals(er.inspect(), Box.Err("none").inspect(), "basic maybeToBox err working")

  ok = Box.maybeToBox("none", Maybe.Just, "some")
  er = Box.maybeToBox("none", Maybe.Nothing, "some")
  t.equals(ok.inspect(), Box.Ok("some").inspect(), "function returning maybeToBox ok working")
  t.equals(er.inspect(), Box.Err("none").inspect(), "function returning maybeToBox err working")
})

test("Box ResultToBox ", function (t) {
  t.plan(9)
  const err = /Result returning function required/i
  t.throws(() => Box.ResultToBox(null), err, "Result or Result returning function required")
  t.throws(() => Box.ResultToBox(55), err, "Result or Result returning function required")
  t.throws(() => Box.ResultToBox("str"), err, "Result or Result returning function required")

  t.ok(
    isFunction(() => Box.ResultToBox(unit)),
    "ResultToBox returns a function when a function is provided"
  )

  t.throws(() => Box.ResultToBox(unit)(), err, "function should return a Result")

  let ok = Box.ResultToBox(crocks.Result.Ok("some"))
  let er = Box.ResultToBox(crocks.Result.Err("none"))
  t.equals(ok.inspect(), Box.Ok("some").inspect(), "basic ResultToBox ok working")
  t.equals(er.inspect(), Box.Err("none").inspect(), "basic ResultToBox err working")

  ok = Box.ResultToBox(crocks.Result.Ok, "some")
  er = Box.ResultToBox(crocks.Result.Err, "error")
  t.equals(ok.inspect(), Box.Ok("some").inspect(), "function returning ResultToBox ok working")
  t.equals(er.inspect(), Box.Err("error").inspect(), "function returning ResultToBox err working")
})

test("Box waitUntil functionality", function (t) {
  t.plan(21)
  const err = /must be a number|must be a function/
  t.throws(() => Box.waitUntil("error", "error", null, 1), err, "all arguments should be proper")
  t.throws(() => Box.waitUntil(500, 30, null, 1), err, "all arguments should be proper")
  t.throws(() => Box.waitUntil("error", "error", () => true, 1), err, "all arguments should be proper")
  t.ok(isFunction(Box.waitUntil(500)), "curried interface works fine")
  t.ok(isFunction(Box.waitUntil(500, 30)), "curried interface works fine")
  t.ok(isFunction(Box.waitUntil(500, 30, () => true)), "curried interface works fine")

  let verify = curry((msg, y, x) => t.equals(x.inspect ? x.inspect() : x, y.inspect ? y.inspect() : y, msg))

  var start, gl
  let diff = 50

  // Wait Until succeeds for a simple function returning boolean
  gl = 1
  start = Date.now()
  var fnA = sinon.spy(() => gl++ >= 5)
  Box.waitUntil(500, 30, fnA, 1).run((x) => {
    verify("waitUntil suceeds and shows correct value", Box(1), x)
    t.ok(fnA.getCalls().length === 5, `fnA called 5 times, ${fnA.getCalls().length}`)
    t.ok(Date.now() - start < 150 + diff, `Looped 5 times : ${Date.now() - start}`)
  })

  // Wait Until times for a simple function returning boolean
  var gl2 = 1
  start = Date.now()
  var fnA2 = sinon.spy(() => gl2++ >= 5)
  Box.waitUntil(120, 30, fnA2, 2).run((x) => {
    verify("waitUntil times out and shows timed out", Box.Err("Box.waitUntil: Timed out"), x)
    t.ok(fnA2.getCalls().length < 5, `fnA2 was not called 5 times, ${fnA.getCalls().length}`)
    t.ok(Date.now() - start < 130 + diff, `Looped <5 times : ${Date.now() - start}`)
  })

  // Wait Until times out for a function returning Box boolean
  var gl3 = 1
  start = Date.now()
  var fnA3 = sinon.spy(() => Box(gl3++ >= 5))
  Box.waitUntil(120, 30, fnA3, 2).run((x) => {
    verify("waitUntil times out and shows timed out", Box.Err("Box.waitUntil: Timed out"), x)
    t.ok(fnA3.getCalls().length < 5, `fnA3 was not called 5 times, ${fnA.getCalls().length}`)
    t.ok(Date.now() - start < 130 + diff, `Looped <5 times : ${Date.now() - start}`)
  })

  // Wait Until succeeds for a function returning Box boolean
  var gl4 = 1
  start = Date.now()
  var fnA4 = sinon.spy(() => Box(gl4++ >= 5))
  Box.waitUntil(500, 30, fnA4, 2).run((x) => {
    verify("waitUntil times out and shows correct value", Box.Ok(2), x)
    t.ok(fnA4.getCalls().length === 5, `fnA4 called 5 times, ${fnA.getCalls().length}`)
    t.ok(Date.now() - start < 150 + diff, `Looped 5 times : ${Date.now() - start}`)
  })

  // Wait Until fails for a function returning Box Error
  var gl5 = 1
  start = Date.now()
  var fnA5 = sinon.spy(() => (gl5++ > 2 ? Box.Err("error") : Box(false)))
  Box.waitUntil(500, 30, fnA5, 2).run((x) => {
    verify("waitUntil shows Error correctly", Box.Err("error"), x)
    t.ok(fnA5.getCalls().length < 5, `fnA5 was not called 5 times, ${fnA.getCalls().length}`)
    t.ok(Date.now() - start < 60 + diff, `Looped <5 times : ${Date.now() - start}`)
  })
})
