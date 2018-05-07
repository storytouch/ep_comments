var utils = require('./utils');

var textHighlighter = function(highlightId) {
  this.highlightId = highlightId;
  this.$head = utils.getPadInner().find('head');
}

textHighlighter.prototype.highlightTargetTextOf = function(textMarkId, color) {
  var styleClass   = this.highlightId + ' ' + this._getTextMarkStyleClass(textMarkId);
  var textSelector = '.' + textMarkId;
  var colorStyle   = 'background: ' + color + ' !important';
  this.$head.append(`<style class="${styleClass}">${textSelector}{${colorStyle}}</style>`);
}

textHighlighter.prototype.removeHighlightOfTargetTextOf = function(textMarkId) {
  var styleClass = this._getStyleClass(textMarkId);
  this.$head.find(styleClass).remove();
}

textHighlighter.prototype.removeHighlightOfAllTextMarks = function() {
  var styleClass = this._getStyleClass();
  this.$head.find(styleClass).remove();
}

textHighlighter.prototype._getStyleClass = function(textMarkId) {
  var cls = '.' + this.highlightId;
  if (textMarkId) {
    cls += '.' + this._getTextMarkStyleClass(textMarkId);
  }
  return cls;
}

textHighlighter.prototype._getTextMarkStyleClass = function(textMarkId) {
  return this.highlightId + '--' + textMarkId;
}

exports.init = function(highlightId) {
  return new textHighlighter(highlightId);
}
