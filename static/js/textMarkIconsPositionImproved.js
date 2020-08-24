var _ = require('ep_etherpad-lite/static/js/underscore');
var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var Changeset = require('ep_etherpad-lite/static/js/Changeset');
var simplePageViewUtils = require('ep_script_simple_page_view/static/js/utils');

var utils = require('./utils');
var shared = require('./shared');

var FIRST_LINE_OF_PAD = 0;
/*
Values of config:
  - hideIcons: function that hides the target icons
  - textMarkClass: class applied on the line(<div>) where it has the text mark (e.g. '.comment')
  - textMarkPrefix: string that is the prefix of the text mark. (e.g. 'c-')
  - adjustTopOf: function that adjusts the position of the icon
*/
var textMarkIconsPositionImproved = function(config, ace) {
  var self = this;
  ace.callWithAce(function(ace) {
    self.rep = ace.ace_getRep();
    self.hideIcons = config.hideIcons;
    self.textMarkClass = config.textMarkClass;
    self.textMarkPrefix = config.textMarkPrefix;
    self.adjustTopOf = config.adjustTopOf;
    self.editorPaddingTop = simplePageViewUtils.getEditorPaddingTop();
  });
};

// Set all text mark icons to be aligned with text where's applied
// or when it is applied on a hidden line, it looks for a eligible
// line to show it aside
textMarkIconsPositionImproved.prototype.updateAllIconsPosition = function() {
  this.updateIconsPosition(FIRST_LINE_OF_PAD);
};

textMarkIconsPositionImproved.prototype.updateIconsPosition = function(lineOfChange) {
  var updateAllIcons = lineOfChange === FIRST_LINE_OF_PAD;
  this.hideIcons(updateAllIcons);

  var self = this;
  var inlineTextMarks = this._getTextMarkIdAndItsPosition(lineOfChange);

  $.each(inlineTextMarks, function() {
    if (this.textMarkId && this.textMarkIconPosition) {
      self.adjustTopOf(this.textMarkId, this.textMarkIconPosition);
    }
  });
};

textMarkIconsPositionImproved.prototype._getTextMarkIdAndItsPosition = function(lineOfChange) {
  var textMarksOccurrences = this._getTextMarksOccurrences(lineOfChange);
  var textMarkIdAndItsPosition = _.map(
    textMarksOccurrences,
    function(textMarkOccurrence) {
      return {
        textMarkId: textMarkOccurrence.key,
        textMarkIconPosition: this._getTextMarkIconPosition(textMarkOccurrence),
      };
    },
    this
  );
  return textMarkIdAndItsPosition;
};

// lineOfChange is the line that's used as first one of the interval that we need
// to recalculate textMark icons' position
textMarkIconsPositionImproved.prototype._getTextMarksOccurrences = function(lineOfChange) {
  var totalOfLines = this.rep.lines.length();
  var indexesRange = _.range(lineOfChange, totalOfLines);
  return _.chain(indexesRange)
    .map(function(lineNumber) {
      return this._getSelectionAttributesOnLine(lineNumber, this.textMarkPrefix);
    }, this)
    .flatten()
    .unique(function(entry) {
      return entry.key;
    })
    .value();
};

textMarkIconsPositionImproved.prototype._getSelectionAttributesOnLine = function(lineNumber, attributePrefix) {
  var self = this;

  var occurrences = [];
  var lineAttribs = self.rep.alines[lineNumber];

  var it = Changeset.opIterator(lineAttribs);
  var op = null;
  var offset = 0;

  while (it.hasNext()) {
    var op = it.next();

    Changeset.eachAttribNumber(op.attribs, function(attribNumber) {
      var attribKey = self.rep.apool.getAttribKey(attribNumber);
      if (attribKey.startsWith(attributePrefix)) {
        occurrences.push({
          key: attribKey,
          value: self.rep.apool.getAttribValue(attribNumber),
          attrib: self.rep.apool.getAttrib(attribNumber),
          attribNumber: attribNumber,
          lineNumber: lineNumber,
          offset: offset,
          length: op.chars,
        });
      }
    });

    offset += op.chars;
  }

  return occurrences;
};

textMarkIconsPositionImproved.prototype._getTextMarkIconPosition = function(textMarkOccurrence) {
  var iconPosition = 0;
  var userLineOfOccurrence = this._getUserLineOfOccurrence(textMarkOccurrence);
  var nextVisibleUserLine = this._getNextVisibleUserLine(userLineOfOccurrence);

  if (nextVisibleUserLine) {
    // place the icon on the text height, considering its margin
    iconPosition = this.editorPaddingTop + nextVisibleUserLine.y0 + nextVisibleUserLine.marginTop;
  }

  return iconPosition;
};

textMarkIconsPositionImproved.prototype._getUserLineOfOccurrence = function(textMarkOccurrence) {
  var userLines = pad.plugins.ep_script_dimensions.calculateUserLines.getUserLines();
  var lineNumber = textMarkOccurrence.lineNumber;

  var userLinesOfLineNumber = userLines.filter(function(x) {
    return x.parentIndex === lineNumber;
  });

  if (!userLinesOfLineNumber.length) return null;

  var lineOffset = userLinesOfLineNumber[0].offset;
  var attribOffsetOnText = lineOffset + textMarkOccurrence.offset;

  // if the line has marker, the first char is a "*"
  //var lineHasMarker = attributeManager.lineHasMarker(lineNumber);
  //if (lineHasMarker) attribOffsetOnText -= 1;

  var userLineAtOffsetIndex = userLinesOfLineNumber.findIndex(function(x) {
    return x.offset > attribOffsetOnText;
  });

  if (userLineAtOffsetIndex > -1) {
    // if the index was found, so we get the previous line,
    // the one with offset within [lineOffset, attribOffsetOnText]
    userLineAtOffsetIndex = userLineAtOffsetIndex - 1;
  } else {
    // if the index was not found, so it is the last user line
    // of this Etherpad line
    userLineAtOffsetIndex = userLinesOfLineNumber.length - 1;
  }

  return userLinesOfLineNumber[userLineAtOffsetIndex];
};

textMarkIconsPositionImproved.prototype._getNextVisibleUserLine = function(userLine) {
  if (!userLine || userLine.visible) return userLine;
  var userLines = pad.plugins.ep_script_dimensions.calculateUserLines.getUserLines();
  for (var i = userLine.index + 1; i < userLines.length; i++) {
    var it = userLines[i];
    if (it.visible) return it;
  }
  return null;
};

exports.init = function(config, ace) {
  return new textMarkIconsPositionImproved(config, ace);
};
