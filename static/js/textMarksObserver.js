var _ = require('ep_etherpad-lite/static/js/underscore');
var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var TextMarksFinder = require('./textMarksFinder');
var TextMarkObserverWorker = require('./textMarksObserver.worker.js');
var epSDShared = require('ep_script_dimensions/static/js/shared');

var utils = require('./utils');

var textMarksObserver = function(ace) {
  var self = this;
  ace.callWithAce(function(ace) {
    self.rep = ace.ace_getRep();
    self.attribPrefixesToObserve = [];
    self.listenersMap = {};
    self.userLines = pad.plugins.ep_script_dimensions.calculateUserLines.getUserLines();

    // background worker
    self.worker = new TextMarkObserverWorker();
    self._listenToWorkerMessages();
    self._listenToUserLinesChanged();
  });
};

// async processing public interface
textMarksObserver.prototype.observeAttribute = function(attributePrefix, listener) {
  var prefixIndex = this.attribPrefixesToObserve.indexOf(attributePrefix);
  if (prefixIndex === -1) {
    this.attribPrefixesToObserve.push(attributePrefix);
    this.listenersMap[attributePrefix] = [];
  }

  this.listenersMap[attributePrefix].push(listener);
};

// sync processing public interface
textMarksObserver.prototype.getAttributeOccurrences = function(attributePrefix) {
  return this._performSync(attributePrefix);
};

textMarksObserver.prototype._performAsync = function(lineOfChange) {
  var finderParameters = this._getFinderParameters(this.attribPrefixesToObserve, lineOfChange);
  this.worker.postMessage(finderParameters);
};

textMarksObserver.prototype._performSync = function(attributePrefix) {
  var attribPrefixesToObserve = [attributePrefix];
  var finderParameters = this._getFinderParameters(attribPrefixesToObserve);
  var finder = new TextMarksFinder(finderParameters);
  var result = finder.perform();
  return result[attributePrefix];
};

textMarksObserver.prototype._getFinderParameters = function(attribPrefixesToObserve, lineOfChange) {
  return {
    attribPrefixesToObserve: attribPrefixesToObserve,
    lineOfChange: lineOfChange,
    repALines: this.rep.alines,
    repAPool: this.rep.apool,
    repLinesLength: this.rep.lines.length(),
    userLines: this.userLines,
  };
};

textMarksObserver.prototype._listenToUserLinesChanged = function() {
  var $innerDoc = utils.getPadInner().find('#innerdocbody');
  var self = this;
  $innerDoc.on(epSDShared.USERS_LINES_CHANGED, function(event, data) {
    self.userLines = data.userLines;

    var firstUserLineChanged = data.firstUserLineChanged;
    var lineOfChange = firstUserLineChanged ? firstUserLineChanged.parentIndex : 0;
    self._performAsync(lineOfChange);
  });
};

textMarksObserver.prototype._listenToWorkerMessages = function() {
  var self = this;
  this.worker.addEventListener('message', function(e) {
    var textMarksOccurrences = e.data.textMarksOccurrences;
    var lineOfChange = e.data.lineOfChange;

    self._publishOccurrences(textMarksOccurrences, lineOfChange);
  });
};

textMarksObserver.prototype._publishOccurrences = function(textMarksOccurrences, lineOfChange) {
  var self = this;
  Object.keys(textMarksOccurrences).forEach(function(attributePrefix) {
    var occurrences = textMarksOccurrences[attributePrefix];
    var listeners = self.listenersMap[attributePrefix];
    listeners.forEach(function(listener) {
      listener.apply(null, [occurrences, lineOfChange]);
    });
  });
};

exports.init = function(ace) {
  return new textMarksObserver(ace);
};
