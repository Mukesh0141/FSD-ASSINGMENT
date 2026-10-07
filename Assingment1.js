// Assignment: Why is a function that calls its callback directly (sometimes)
// misleading, and how do we fix it?   Run: node zalgo.js

// ---------------------------------------------------------------
// THE PROBLEM ("releasing Zalgo")
// ---------------------------------------------------------------
// This function is INCONSISTENT:
//   - cache HIT  -> callback runs immediately  (synchronous)
//   - cache MISS -> callback runs later        (asynchronous)
// The caller cannot tell which one will happen, because it depends on
// hidden internal state. So the order of the code after the call changes
// from one call to the next, which causes hard-to-find bugs.
const cache = {};

function getDataBad(key, callback) {
  if (cache[key]) {
    callback(cache[key]); // sync: runs BEFORE the function returns
  } else {
    setTimeout(() => {
      cache[key] = 'value for ' + key;
      callback(cache[key]); // async: runs AFTER the function returns
    }, 100);
  }
}

// ---------------------------------------------------------------
// THE FIX
// ---------------------------------------------------------------
// Defer the synchronous branch with process.nextTick so the callback is
// ALWAYS asynchronous. (setImmediate would work too.)
const cache2 = {};

function getDataGood(key, callback) {
  if (cache2[key]) {
    process.nextTick(() => callback(cache2[key])); // now async
  } else {
    setTimeout(() => {
      cache2[key] = 'value for ' + key;
      callback(cache2[key]);
    }, 100);
  }
}

// ---------------------------------------------------------------
// DEMO: call each version twice (1st = cache miss, 2nd = cache hit)
// ---------------------------------------------------------------
function run(name, fn, done) {
  console.log(`${name}: before`);
  fn('a', () => console.log(`${name}: callback`));
  console.log(`${name}: after`);
  setTimeout(done, 200); // wait so the async path finishes
}

run('BAD  1st', getDataBad, () =>
  run('BAD  2nd', getDataBad, () =>   // order changes: callback comes BEFORE after
    run('GOOD 1st', getDataGood, () =>
      run('GOOD 2nd', getDataGood, () => {}) // order is the same every time
    )
  )
);

// ---------------------------------------------------------------
// DIFFERENCE
// ---------------------------------------------------------------
// BAD : output order depends on cache state (sometimes before/after swap).
// GOOD: callback is always async, so the order is always
//       "before -> after -> callback".
// Rule: an API should be either ALWAYS sync or ALWAYS async, never both.
//
// nextTick vs setImmediate:
//   process.nextTick - runs right after the current operation, before the
//                      event loop continues (fast, but can starve I/O).
//   setImmediate     - runs in the next event loop iteration, after I/O.
