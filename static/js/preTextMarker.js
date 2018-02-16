var _ = require('ep_etherpad-lite/static/js/underscore');
var shared = require('./shared');

var BASE_CLASS = 'pre-selected-';
var MARK_TEXT_EVENT = 'markText';
var UNMARK_TEXT_EVENT = 'unmarkText';

exports.MARK_TEXT_EVENT = MARK_TEXT_EVENT;
exports.UNMARK_TEXT_EVENT = UNMARK_TEXT_EVENT;

var doNothing = function() {}

var preTextMarker = function(targetType, ace) {
  this.ace = ace;
  this.targetType = targetType;

  this.markClassPrefix = BASE_CLASS + targetType + '-';
  // `clientVars.userId` has a `'.'`, which might mess up with jQuery selectors.
  // Remove it to avoid confusion
  this.markAttribName = this.markClassPrefix + clientVars.userId.replace('a.', '');

  this.markTextEvent = MARK_TEXT_EVENT + '-' + targetType;
  this.unmarkTextEvent = UNMARK_TEXT_EVENT + '-' + targetType;

  // remove any existing marks, as there is no item being added on plugin initialization
  // (we need the timeout to let the plugin be fully initialized before starting to remove
  // marked texts)
  var self = this;
  setTimeout(function() {
    self.unmarkSelectedText();
  }, 0);
}

preTextMarker.prototype.markSelectedText = function(aceContext) {
  if (aceContext && aceContext.callstack) {
    // there's an active callstack already, don't need to create a new one
    this.handleMarkText(aceContext.editorInfo, aceContext.rep, aceContext.callstack);
  } else {
    // we need a callstack to be able to make text marking/unmarking
    // a non-undoable event, so prepare to create a callstack here
    this.ace.callWithAce(doNothing, this.markTextEvent, true);
  }
}
preTextMarker.prototype.unmarkSelectedText = function() {
  this.ace.callWithAce(doNothing, this.unmarkTextEvent, true);
}

preTextMarker.prototype.processAceEditEvent = function(context) {
  var editorInfo = context.editorInfo;
  var rep        = context.rep;
  var callstack  = context.callstack;
  var eventType  = callstack.editEvent.eventType;

  if(eventType === this.unmarkTextEvent) {
    this.handleUnmarkText(editorInfo, rep, callstack);
    this.avoidEditorToBeScrolled(callstack, UNMARK_TEXT_EVENT);
  } else if(eventType === this.markTextEvent) {
    this.handleMarkText(editorInfo, rep, callstack);
    this.avoidEditorToBeScrolled(callstack, MARK_TEXT_EVENT);
  }
}

preTextMarker.prototype.handleMarkText = function(editorInfo, rep, callstack) {
  // first we need to unmark any existing text, otherwise we'll have 2 text ranges marked
  this.removeMarks(editorInfo, rep, callstack);

  this.addMark(editorInfo, callstack);
}

preTextMarker.prototype.handleUnmarkText = function(editorInfo, rep, callstack) {
  this.removeMarks(editorInfo, rep, callstack);
}

preTextMarker.prototype.avoidEditorToBeScrolled = function(callstack, nonScrollableEventName) {
  // each instance of preTextMarker needs an specific eventType suffix, but any of them
  // should be scrollable. As Etherpad does not allow dynamic event names to be set as
  // non-scrollable, we need to change current callstack event name to a non-dynamic one to
  // be able to block editor scroll
  callstack.type = nonScrollableEventName;
}

preTextMarker.prototype.addMark = function(editorInfo, callstack) {
  var eventType  = callstack.editEvent.eventType;
  var attributeName = this.markAttribName;

  // we don't want the text marking to be undoable
  this.performNonUnduableEvent(eventType, callstack, function() {
    editorInfo.ace_setAttributeOnSelection(attributeName, true);
  });
}

preTextMarker.prototype.removeMarks = function(editorInfo, rep, callstack) {
  // make sure rep is up to date, otherwise originalSel* values will have outdated
  // positions and the selection will be restored to an outdated position at the
  // end of this function
  editorInfo.ace_fastIncorp();

  var eventType        = callstack.editEvent.eventType;
  var originalSelStart = rep.selStart;
  var originalSelEnd   = rep.selEnd;
  var attributeName    = this.markAttribName;
  var selector         = this.getMarkerSelector();

  // we don't want the text marking to be undoable
  this.performNonUnduableEvent(eventType, callstack, function() {
    // remove marked text
    var repArr = editorInfo.ace_getRepFromSelector(selector);
    // repArr is an array of reps
    _(repArr).each(function(rep) {
      editorInfo.ace_performSelectionChange(rep[0], rep[1], true);
      editorInfo.ace_setAttributeOnSelection(attributeName, false);
    });

    // make sure selected text is back to original value
    editorInfo.ace_performSelectionChange(originalSelStart, originalSelEnd, true);
  });
}

preTextMarker.prototype.performNonUnduableEvent = function(eventType, callstack, action) {
  callstack.startNewEvent('nonundoable');
  action();
  callstack.startNewEvent(eventType);
}

preTextMarker.prototype.processCollectContentPre = function(context) {
  shared.collectAttribFrom(context, this.markClassPrefix);
}

preTextMarker.prototype.processAceAttribsToClasses = function(context) {
  if (context.key === this.markAttribName) {
    return [context.key];
  }
}

preTextMarker.prototype.getMarkerSelector = function() {
  return '.' + this.markAttribName;
}

exports.createForTarget = function(targetType, ace) {
  var newMarker = new preTextMarker(targetType, ace);
  pad.preTextMarkers = pad.preTextMarkers || {};
  pad.preTextMarkers[targetType] = newMarker;

  return newMarker;
}

// process hooks for all text markers
exports.processAceEditEvent = function(context) {
  _(pad.preTextMarkers).each(function(marker) {
    marker.processAceEditEvent(context);
  });
}
exports.processCollectContentPre = function(context) {
  _(pad.preTextMarkers).each(function(marker) {
    marker.processCollectContentPre(context);
  });
}
exports.processAceAttribsToClasses = function(context) {
  return _(pad.preTextMarkers)
    .chain()
    .map(function(marker) { return marker.processAceAttribsToClasses(context) })
    .flatten()
    .compact()
    .value();
}
