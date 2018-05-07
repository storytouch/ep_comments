var _ = require('ep_etherpad-lite/static/js/underscore');

var utils = require('./utils');
var smUtils = require('ep_script_scene_marks/static/js/utils');

var textMarkSMVisibility = function(ace) {
  this.ace = ace;
}

textMarkSMVisibility.prototype.showSMHiddenIfTextMarkIsOnIt = function(textMarkId) {
  var self = this;
  this.ace.callWithAce(function(ace){
    var rep = ace.ace_getRep();
    var textMarkIsOnSceneMarkHidden = self._isTextMarkAppliedOnlyOnASMHidden(textMarkId);

    if (textMarkIsOnSceneMarkHidden) {
      var firstLineWhereTextMarkIsApplied = self._getFirstLineWhereTextMarkIsApplied(textMarkId, rep);
      ace.ace_showSceneMarksAroundLine(firstLineWhereTextMarkIsApplied);
    }
  });
}

textMarkSMVisibility.prototype._isTextMarkAppliedOnlyOnASMHidden = function(textMarkId) {
  var $linesWhereTextMarkIsApplied = utils.getPadInner().find('div').has('.' + textMarkId);
  var textMarkIsAppliedOnlyOnSceneMark = _.every($linesWhereTextMarkIsApplied, function(line){
    return smUtils.checkIfHasSceneMark($(line));
  });

  return textMarkIsAppliedOnlyOnSceneMark && this._allLinesAreHidden($linesWhereTextMarkIsApplied);
}

textMarkSMVisibility.prototype._getFirstLineWhereTextMarkIsApplied = function(textMarkId, rep) {
  var $line = utils.getPadInner().find('div').has('.' + textMarkId).first();
  return smUtils.getLineNumberFromDOMLine($line, rep);
}

textMarkSMVisibility.prototype._allLinesAreHidden = function($lines) {
  return _.every($lines, function(line){
    var isLineVisible = line.getBoundingClientRect().height;
    return !isLineVisible;
  });
}

exports.init = function(ace) {
  return new textMarkSMVisibility(ace);
}
