var _ = require('ep_etherpad-lite/static/js/underscore');

var detailedLinesChangedListener = require('ep_script_scene_marks/static/js/detailedLinesChangedListener');
var eascUtils = require('ep_script_toggle_view/static/js/utils');

var utils     = require('./utils');
var scheduler = require('./scheduler');

var FIRST_LINE_OF_PAD = 0;

var lineChangeEventTriggerer = function(ace) {
  this.minLineChanged = undefined;
  this.rep = this._getRep(ace);
  this._listenToDifferentScenariosWhereLinePositionMightChangeOnScreen();
}

lineChangeEventTriggerer.prototype._getRep = function(ace) {
  var rep;
  ace.callWithAce(function(ace) {
    rep = ace.ace_getRep();
  });
  return rep;
}

lineChangeEventTriggerer.prototype._listenToDifferentScenariosWhereLinePositionMightChangeOnScreen = function() {
  var self = this;

  // to avoid lagging while user is typing, we set a scheduler to postpone
  // calling callback until edition had stopped
  this.padChangedListener = scheduler.setCallbackWhenUserStopsChangingPad(
    self._triggerLineChangedForMinimunLine.bind(self)
  );

  detailedLinesChangedListener.onLinesAddedOrRemoved(function(linesChanged) {
    self._updateMinLineChanged(linesChanged.linesNumberOfChangedNodes);
    self.padChangedListener.padChanged();
  }, true, this.rep);

  // When screen size changes (user changes device orientation, for example),
  // we need to make sure all sidebar comments are on the correct place
  utils.waitForResizeToFinishThenCall(200, function() {
    self._triggerLineChangedForEntirePad();
  });

  utils.getPadInner().on(eascUtils.EASC_CHANGED_EVENT, function(e) {
    self._triggerLineChangedForEntirePad();
  });
}

lineChangeEventTriggerer.prototype._updateMinLineChanged = function(linesChangedOnThisBatch) {
  var topLineChangedOnThisBatch = _.min(linesChangedOnThisBatch);
  this.minLineChanged = _.min([topLineChangedOnThisBatch, this.minLineChanged]);
}

lineChangeEventTriggerer.prototype._triggerLineChangedForMinimunLine = function() {
  this._tellOtherPluginsThatLineChanged(this.minLineChanged || FIRST_LINE_OF_PAD);
  this.minLineChanged = undefined; // reset value
}

lineChangeEventTriggerer.prototype._triggerLineChangedForEntirePad = function() {
  this._tellOtherPluginsThatLineChanged(FIRST_LINE_OF_PAD);
}

lineChangeEventTriggerer.prototype._tellOtherPluginsThatLineChanged = function(lineNumber) {
  var $innerDoc = utils.getPadInner().find('#innerdocbody');
  $innerDoc.trigger(utils.LINE_CHANGED_EVENT, { lineNumber: lineNumber });
}

exports.init = function(ace) {
  return new lineChangeEventTriggerer(ace);
}
