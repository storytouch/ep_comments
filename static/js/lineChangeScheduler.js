var lineChangeScheduler = function(callback, timeout) {
  this.timer = undefined;
  this.lastLineChanged = undefined;
  this.callback = callback;
  this.timeout = timeout;
}

lineChangeScheduler.prototype.padChanged = function(lineOfChange) {
  var self = this;

  // we must check if a previous line change is already scheduled
  // before set "lastLineChanged". Otherwise, changes in previous lines
  // won't be handled.
  if (self.lastLineChanged === undefined || self.lastLineChanged > lineOfChange) {
    self.lastLineChanged = lineOfChange;
  }

  clearTimeout(self.timer);
  self.timer = setTimeout(function() {
    self.callback(self.lastLineChanged);
    self.lastLineChanged = undefined;
  }, self.timeout);
}

exports.setCallbackWhenUserStopsChangingPad = function(callback, timeout) {
  return new lineChangeScheduler(callback, timeout);
}

