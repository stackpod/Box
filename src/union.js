/** @license ISC License (c) copyright 2016 original and current authors */
/** @author Moorthy RS (rsm@stackpod.io) Modified from https://github.com/evilsoft/crocks/blob/master/src/core/defineUnion.js */

import { default as crocks } from "crocks"

const { curry, isArray, isEmpty, isFunction, isObject, isString } = crocks

var constant = function (x) {
  return function () {
    return x
  }
}

var isDefinition = function (x) {
  return isString(x) && x.length
}

function caseOf(defs) {
  return function (cases, m) {
    var tag = m.tag
    var def = defs[tag()]
    // console.log("caseOf step 1", cases, m, def, tag, tag())

    var args = def.reduce(function (xs, x) {
      return xs.concat([m[x].value()])
    }, [])
    // console.log("caseOf step 2", args)

    let ret = cases[tag()].apply(null, args)
    // console.log("caseOf step 3", ret)
    return ret
  }
}

var includes = function (defs) {
  return function (m) {
    // console.log("includes step 1", m && m.tag ? m.tag() : "none")
    let ret = !!m && isFunction(m.tag) && Object.keys(defs).indexOf(m.tag()) !== -1
    // console.log("includes step 2", ret)
    return ret
  }
}

function construction(def, tag) {
  return function () {
    var args = [],
      len = arguments.length
    while (len--) args[len] = arguments[len]

    return def.reduce(
      function (obj, key, index) {
        obj[key] = { value: constant(args[index]) }
        return obj
      },
      { tag: constant(tag), inspect, toString: inspect }
    )
  }
}

function inspect() {
  if (this.caseOf && this.includes) {
    let vals = Object.keys(this)
      .filter((x) => x !== "inspect" && x !== "caseOf" && x !== "includes" && x !== "toString")
      .join(" ")
    return `Union of types: ${vals}`
  } else if (this.tag && isFunction(this.tag)) {
    let keys = Object.keys(this).filter((x) => x !== "inspect" && x !== "tag" && x !== "toString")
    let tag = this.tag ? this.tag() : "notag"
    let vals = keys.map((x) => (isFunction(this[x]?.value) ? this[x]?.value() : "invalid union value")).join(" ")
    return `${tag} ${vals}`
  } else return `invalid union`
}

export function defineUnion(defs) {
  if (!isObject(defs) || isEmpty(defs)) {
    throw new TypeError("defineUnion: Argument must be an Object containing definition lists")
  }

  return Object.keys(defs).reduce(
    function (obj, tag) {
      var def = defs[tag]

      if (
        !isArray(def) ||
        !def.reduce(function (x, y) {
          return x && isDefinition(y)
        }, true)
      ) {
        throw new TypeError("defineUnion: Definitions must be a list of non-empty string identifiers")
      }

      obj[tag] = construction(def, tag)

      return obj
    },
    { caseOf: curry(caseOf(defs)), includes: curry(includes(defs)), inspect, toString: inspect }
  )
}
