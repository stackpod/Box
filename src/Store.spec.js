/* eslint-disable node/no-unpublished-import  */

import test from "tape"

import sinon from "sinon"

import { Box } from "./Box.js"

import { Store, Cache } from "./Store.js"

import { default as crocks } from "crocks"

const { isFunction, compose } = crocks

const { isBox } = Box

const slice = (x) => Array.prototype.slice.call(x)

const add1 = (x) => x + 1
const delay = (ms) => (x) => new Promise((resolve) => setTimeout(() => resolve(x), ms))
const chainAdd1Async = async (x) => Box(x + 1)
const log = (x) => {
  console.log(`log:: ${x.inspect ? x.inspect() : x}`)
  return x
}
const tee = (fn) => compose(log, fn, log)

test("Store basic functionality", function (t) {
  const { get, set, keyf } = Store()

  var key = "state"

  t.ok(isFunction(get), "get is a function")
  t.ok(isFunction(set), "set is a function")
  t.ok(isFunction(keyf), "keyf is a function")

  t.ok(isFunction(get(key)), "get(key) is a function")
  t.ok(isFunction(set(key)), "set(key) is a function")

  t.end()
})

test("Store get/set functionality", function (t) {
  const { get, set, modify } = Store()

  var key = "state"
  var madd1 = sinon.spy(add1)

  t.equals(get(key)(), undefined, "get(key) has not value")
  t.equals(set(key, 5), 5, "set(key) returns the same value")
  t.equals(get(key)(), 5, "get(key) gets the same value")

  t.equals(modify(key, madd1), 6, "modify() returns new value")
  t.equals(get(key)(), 6, "get(key) gets the new value")
  t.ok(madd1.calledOnce, "modify function was called once")
  t.equals(madd1.args[0][0], 5, "modify function input was correct value")
  t.equals(madd1.returnValues[0], 6, "modify function output was correct value")
  t.end()
})

test("Store keyf functionality", function (t) {
  const { keyf } = Store()

  var key = "state"

  var state = keyf(key)

  var madd1 = sinon.spy(add1)

  t.ok(isFunction(state.get), "keyf.get is a function")
  t.ok(isFunction(state.set), "keyf.set is a function")
  t.ok(isFunction(state.modify), "keyf.modify is a function")

  t.equals(state.get(), undefined, "keyf.get() has not value")
  t.equals(state.set(10), state, "keyf.set() returns state again")
  t.equals(state.get(), 10, "keyf.get() has set value")
  t.equals(state.modify(madd1), state, "keyf.modify() returns state again")
  t.equals(state.get(), 11, "keyf.get() has incremented value")
  t.ok(madd1.calledOnce, "modify function was called once")
  t.equals(madd1.args[0][0], 10, "modify function input was correct value")
  t.equals(madd1.returnValues[0], 11, "modify function output was correct value")
  t.end()
})

test("Cache basic functionality", function (t) {
  const ca = Cache(300)

  t.plan(7)

  t.ok(isFunction(ca.get), "get is a function")
  t.ok(isFunction(ca.set), "set is a function")
  t.ok(isFunction(ca.getFn), "getFn is a function")

  t.equals(ca.get("first"), undefined, "first key is undefined")
  t.equals(ca.set("first", 2), ca, "Cache.set returns the same object back")
  t.equals(ca.get("first"), 2, "Cache.get(first) gets the set value")

  setTimeout(() => t.equals(ca.get("first"), undefined, "expired value"), 400)
})

test("Cache getFn functionality", function (t) {
  var getFn = sinon.spy(() => 55)
  const ca = Cache(300).getFn("first", getFn)

  t.plan(8)

  t.equals(ca.get("first"), 55, "first get based on getFn")
  t.ok(getFn.calledOnce, "the getFn was called just once")
  t.equals(ca.get("first"), 55, "call again get")
  t.ok(getFn.calledOnce, "the getFn still called just once")

  t.equals(ca.set("first", 66), ca, "set returns ca again")
  t.equals(ca.get("first"), 66, "get shows the updated value")

  setTimeout(() => {
    t.equals(ca.get("first"), 55, "after expiry, it shows the getFn value")
    t.ok(getFn.calledTwice, "the getFn now called twice")
  }, 400)
})

test("Cache getFn returning Box", function (t) {
  var getFn = sinon.spy(() => Box.of(22))
  const ca = Cache(300).getFn("first", getFn)

  t.plan(10)

  var b = ca.get("first")

  var b1 = Box.of(1).map((x) => x)

  t.ok(Box.isBox(b), "getFn returns a Box")
  t.equals(b.inspect(), b1.inspect(), "Box has a map (added by Cache), so it returns 'Box Function'")
  t.ok(getFn.calledOnce, "the getFn was called just once")
  t.equals(ca.get("first").inspect(), b1.inspect(), "Since Box is not run, it again shows the same Box")
  t.ok(getFn.calledTwice, "the getFn was called once more, since the cache value is not set")

  b.run((x) => {
    t.equals(x.inspect(), Box.of(22).inspect(), "Box is run now, so it will show the run value")
    t.equals(ca.get("first"), 22, "Since the cache value is set by Cache, it returns the value set")
    t.ok(getFn.calledTwice, "the getFn was still called just twice")
  })
  setTimeout(() => {
    b = ca.get("first")
    t.equals(b.inspect(), b1.inspect(), "After Expiry, Box has a map (added by Cache), so it returns 'Box Function'")
    t.ok(getFn.calledThrice, "the getFn is now called thrice")
  }, 400)
})
