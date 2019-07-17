var _ = require('ep_etherpad-lite/static/js/underscore');
var $ = require('ep_etherpad-lite/static/js/rjquery').$;

var utils = require('./utils');
var shared = require('./shared');

var FIRST_LINE_OF_PAD = 0;
/*
Values of config:
  - hideIcons: function that hides the target icons
  - textMarkClass: class applied on the line(<div>) where it has the text mark (e.g. '.comment')
  - textkMarkPrefix: string that is the prefix of the text mark. (e.g. 'c-')
  - adjustTopOf: function that adjusts the position of the icon
*/
var textMarkIconsPosition = function(config) {
  this.hideIcons = config.hideIcons;
  this.textMarkClass = config.textMarkClass;
  this.textkMarkPrefix = config.textkMarkPrefix;
  this.adjustTopOf = config.adjustTopOf;
}

// Set all text mark icons to be aligned with text where's applied
// or when it is applied on a hidden line, it looks for a eligible
// line to show it aside
textMarkIconsPosition.prototype.updateAllIconsPosition = function() {
  this.updateIconsPosition(FIRST_LINE_OF_PAD);
}
textMarkIconsPosition.prototype.updateIconsPosition = function(lineOfChange) {
  var updateAllIcons = lineOfChange === FIRST_LINE_OF_PAD;
  this.hideIcons(updateAllIcons);

  var self = this;
  var inlineTextMarks = this._getTextMarkIdAndItsPosition(lineOfChange);
  $.each(inlineTextMarks, function() {
    if(this.textMarkId && this.textMarkIconPosition) {
      self.adjustTopOf(this.textMarkId, this.textMarkIconPosition);
    }
  });
}

textMarkIconsPosition.prototype._getTextMarkIdAndItsPosition = function(lineOfChange) {
  var textMarksId = this._getUniqueTextMarksId(lineOfChange);
  var textMarkIdAndItsPosition = _.map(textMarksId, function(textMarkId) {
    return { textMarkId: textMarkId, textMarkIconPosition: this._getTextMarkIconPosition(textMarkId) };
  }, this);
  return textMarkIdAndItsPosition;
 }

 // lineOfChange is the line that's used as first one of the interval that we need
 // to recalculate textMark icons' position
 textMarkIconsPosition.prototype._getUniqueTextMarksId = function(lineOfChange) {
  var $lines = utils.getPadInner().find('div').eq(lineOfChange).nextAll().addBack();
  var inlineTextMarks = $lines.find(this.textMarkClass);
  return _(inlineTextMarks)
    .chain()
    .map(function(inlineTextMark) {
      return shared.getIdsFrom(inlineTextMark.className, this.textkMarkPrefix);
    }, this)
    .flatten()
    .uniq()
    .value();
}

textMarkIconsPosition.prototype._getTextMarkIconPosition = function(textMarkId) {
  var iconPosition =  0;
  var $lines = utils.getPadInner().find('div');
  var $target = $lines.find('.' + textMarkId).first();

  // target icon might not be on pad yet. Eg.: when pasting text with comment,
  // the comment id will have the prefix 'fake-', so an element with the actual
  // comment id won't be on the pad yet
  if ($target.length > 0) {
    var targetElementIsVisible = $target.get(0).getBoundingClientRect().height > 0;
    if (targetElementIsVisible) {
      iconPosition = $target.get(0).offsetTop;
    } else {
      var $targetLine = $target.closest('div');
      iconPosition = this._getTextMarkIconPositionOnHiddenLines($targetLine, textMarkId);
    }
  }

  return iconPosition;
}

// when we have a text mark in a line that's not visible we have 2 possibilities:
// [1] the text mark begins in a SM hidden, so we display the icon in the next element visible element of the SM set
// [2] the text mark begins in a SE hidden, so we look for a line that has the text mark and it is visible
textMarkIconsPosition.prototype._getTextMarkIconPositionOnHiddenLines = function($targetLine, textMarkId) {
  var visibleLine;
  var iconPosition = 0;
  var isSceneMark = $targetLine.hasClass('sceneMark');

  if (isSceneMark) { // [1]
    visibleLine = this._getFirstVisibleLineOfSMSet($targetLine);
  } else { // [2]
    visibleLine = this._getFirstVisibleLineWithTextMark(textMarkId);
  }

  if (visibleLine) {
    iconPosition = this._getPositionOfFirstVisibleTextElementAfterTarget(visibleLine);
  }
  return iconPosition;
}

textMarkIconsPosition.prototype._getFirstVisibleLineOfSMSet = function($smLineNotVisible) {
  var $nextSceneMarks = $smLineNotVisible.nextUntil('div:has(heading)').addBack();
  var $heading = $nextSceneMarks.last().next();
  var $nextSceneMarksWithHeading = $nextSceneMarks.add($heading);
  return this.getFirstVisibleLineOfSet($nextSceneMarksWithHeading);
}

textMarkIconsPosition.prototype._getFirstVisibleLineWithTextMark = function(textMarkId) {
  var $lines = utils.getPadInner().find('div');
  var $linesWithTextMark = $lines.find('.' + textMarkId).map(function(){
    return $(this).closest('div')[0];
  });
  return this.getFirstVisibleLineOfSet($linesWithTextMark);
}

textMarkIconsPosition.prototype.getFirstVisibleLineOfSet = function($lines) {
  return _.find($lines, function(line) {
    return this._isElementVisible(line);
  }, this);
}

textMarkIconsPosition.prototype._isElementVisible = function(line) {
  var isSceneMarkTitle = $(line).find('.sceneMark--title').length;
  var isLineVisible = line.getBoundingClientRect().height;

  // on scene mark title we have an additional padding that is always visible
  // that's why we can't check just its height
  if (isSceneMarkTitle) {
    isLineVisible = $(line).find('span').is(':visible');
  }
  return isLineVisible;
}

// When we have a line without text, we return the position of the <div> [1]
textMarkIconsPosition.prototype._getPositionOfFirstVisibleTextElementAfterTarget = function(line) {
  var textElement = this._getFirstTextElement(line);
  if (!textElement) {
    textElement = line; // [1]
  }
  return textElement.offsetTop;
}

textMarkIconsPosition.prototype._getFirstTextElement = function(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    // return the parentElement because the we don't have the offsetTop of the textNode
    return node.parentElement;
  }else{
    var children = node.childNodes;
    for(var i = 0; i < children.length; i++) {
      var elementFound = this._getFirstTextElement(children[i]);
      if (elementFound) return elementFound;
    }
  }
}

exports.init = function(config) {
  return new textMarkIconsPosition(config);
}
