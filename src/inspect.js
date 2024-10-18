import { default as crocks } from "crocks"

const { isFunction, isString, isArray, isObject, isSymbol, isDate } = crocks

function arrayInspect(xs) {
  return xs.length
    ? xs.map(inspect).reduce(function (a, x) {
      return a + "," + x
    })
    : xs
}
// inspect : a -> String
export function inspect(x) {
  if (x && isFunction(x.inspect)) {
    return " " + x.inspect()
  }

  if (isFunction(x)) {
    return " Function"
  }

  if (isArray(x)) {
    return " [" + arrayInspect(x) + " ]"
  }

  if (isObject(x)) {
    if (Object.keys(x).length > 10) return " <Long Object>"
    return (
      " { " +
      Object.keys(x)
        .reduce(function (acc, key) {
          return acc.concat([key + ":" + inspect(x[key])])
        }, [])
        .join(", ") +
      " }"
    )
  }

  if (isString(x)) {
    if (x.length > 300) return ' "' + x.slice(0, 300) + `.... (${x.length})"`
    return ' "' + x + '"'
  }

  if (isSymbol(x) || isDate(x)) {
    return " " + x.toString()
  }

  return " " + x
}
