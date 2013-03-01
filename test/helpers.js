/*
 * helpers.js: test helpers for the prompt tests.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var stream = require('stream'),
    util = require('util'),
    prompt = require('prompt');

var helpers = exports;

var MockReadWriteStream = helpers.MockReadWriteStream = function () {
  //
  // No need to do anything here, it's just a mock.
  //
  var self = this;
  this.on('pipe', function (src) {
    var _emit = src.emit;
    src.emit = function () {
      //console.dir(arguments);
      _emit.apply(src, arguments);
    };
    
    src.on('data', function (d) {
      self.emit('data', d + '');
    })
  })
};

util.inherits(MockReadWriteStream, stream.Stream);

['resume', 'pause', 'setEncoding', 'flush', 'end'].forEach(function (method) {
  MockReadWriteStream.prototype[method] = function () { /* Mock */ };
});

MockReadWriteStream.prototype.write = function (msg) {
  this.emit('data', msg);
  return true;
};

MockReadWriteStream.prototype.writeNextTick = function (msg) {
  var self = this
  process.nextTick(function () {
    self.write(msg);
  });
};

//
// Create some mock streams for asserting against
// in our prompt teSts.
//
helpers.stdin = new MockReadWriteStream();
helpers.stdout = new MockReadWriteStream();
helpers.stderr = new MockReadWriteStream();

//
// Because `read` uses a `process.nextTick` for reading from
// stdin, it is necessary to write sequences of input with extra
// `process.nextTick` calls
//
helpers.stdin.writeSequence = function (lines) {
  if (!lines || !lines.length) {
    return;
  }

  helpers.stdin.writeNextTick(lines.shift());
  prompt.once('prompt', function () {
    process.nextTick(function () {
      helpers.stdin.writeSequence(lines);
    });
  });
}
