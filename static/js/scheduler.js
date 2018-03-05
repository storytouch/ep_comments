var scheduler = function(callback, timeout) {
  this.timer = undefined;
  this.callback = callback;
  this.timeout = timeout || 300;
}

scheduler.prototype.padChanged = function() {
  clearTimeout(this.timer);
  this.timer = setTimeout(this.callback, this.timeout);
}

exports.setCallbackWhenUserStopsChangingPad = function(callback, timeout) {
  return new scheduler(callback, timeout);
}
