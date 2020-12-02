var _ = require('ep_etherpad-lite/static/js/underscore');
var Changeset = require('ep_etherpad-lite/static/js/Changeset');

var textMarksFinder = function(args) {
  this.attribPrefixesToObserve = args.attribPrefixesToObserve;
  this.userLines = args.userLines;

  // desconstructed rep properties to allow
  // using them inside Workers
  this.repALines = args.repALines;
  this.repAPool = args.repAPool;
  this.repLinesLength = args.repLinesLength;
};

textMarksFinder.prototype.perform = function() {
  return this._getIndexedTextMarkOccurrences();
};

textMarksFinder.prototype._getIndexedTextMarkOccurrences = function() {
  var self = this;

  // initialize groups
  var groupedOccurrences = {};
  this.attribPrefixesToObserve.forEach(function(attribPrefix) {
    groupedOccurrences[attribPrefix] = {};
  });

  // fill in groups
  var textMarksOccurrences = self._getTextMarksOccurrencesAndPositions();
  textMarksOccurrences.forEach(function(occurrence) {
    var group = groupedOccurrences[occurrence.prefix];
    group[occurrence.key] = occurrence;
  });

  return groupedOccurrences;
};

textMarksFinder.prototype._getTextMarksOccurrencesAndPositions = function() {
  var textMarksOccurrences = this._getTextMarksOccurrences();

  var textMarksOccurrencesWithPosition = textMarksOccurrences.map(function(occurrence) {
    var position = this._getTextMarkPosition(occurrence);
    return Object.assign({}, occurrence, { position });
  }, this);

  var sortedOccurrences = textMarksOccurrencesWithPosition.sort(function(a, b) {
    var aUserLine = a.position.userLineOfOccurrence;
    var bUserLine = b.position.userLineOfOccurrence;
    var aIndex = aUserLine ? aUserLine.index : -1;
    var bIndex = bUserLine ? bUserLine.index : -1;
    return aIndex - bIndex;
  });

  return sortedOccurrences;
};

textMarksFinder.prototype._getTextMarksOccurrences = function() {
  var totalOfLines = this.repLinesLength;
  var occurrences = [];

  for (var i = 0; i < totalOfLines; i++) {
    var lineOccurrences = this._getSelectionAttributesOnLine(i);
    occurrences = occurrences.concat(lineOccurrences);
  }

  var uniqueOccurrences = _.unique(occurrences, function(entry) {
    return entry.key;
  });

  return uniqueOccurrences;
};

textMarksFinder.prototype._getSelectionAttributesOnLine = function(lineNumber) {
  var self = this;

  var occurrences = [];
  var lineAttribs = self.repALines[lineNumber];

  var it = Changeset.opIterator(lineAttribs);
  var op = null;
  var offset = 0;

  while (it.hasNext()) {
    var op = it.next();

    Changeset.eachAttribNumber(op.attribs, function(attribNumber) {
      var attrib = self.repAPool.numToAttrib[attribNumber] || [];
      var attribKey = attrib[0] || '';
      var attribValue = attrib[1];

      var matchedPrefix = self._getMatchedPrefix(attribKey);
      if (matchedPrefix) {
        occurrences.push({
          key: attribKey,
          value: attribValue,
          attribNumber: attribNumber,
          lineNumber: lineNumber,
          offset: offset,
          length: op.chars,
          prefix: matchedPrefix,
        });
      }
    });

    offset += op.chars;
  }

  return occurrences;
};

textMarksFinder.prototype._getMatchedPrefix = function(attribKey) {
  return this.attribPrefixesToObserve.find(function(attribPrefix) {
    return attribKey.startsWith(attribPrefix);
  });
};

textMarksFinder.prototype._getTextMarkPosition = function(textMarkOccurrence) {
  var userLineOfOccurrence = this._getUserLineOfOccurrence(textMarkOccurrence);
  var nextVisibleUserLine = this._getNextVisibleUserLineOfSameScene(userLineOfOccurrence);
  return {
    userLineOfOccurrence,
    nextVisibleUserLine,
  };
};

textMarksFinder.prototype._getUserLineOfOccurrence = function(textMarkOccurrence) {
  var lineNumber = textMarkOccurrence.lineNumber;

  var userLinesOfLineNumber = this.userLines.filter(function(x) {
    return x.parentIndex === lineNumber;
  });

  if (!userLinesOfLineNumber.length) return null;

  var lineOffset = userLinesOfLineNumber[0].offset;
  var attribOffsetOnText = lineOffset + textMarkOccurrence.offset;

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

// Given a target user line, it gets the next visible
// user line, which can be:
//
//   [1] If the target user line is visible, then it is
//   already the line we want.
//
//   [2] If the target line is not visible (eg: hidden SM),
//   then we search for the next visible user line within
//   the same SCENE number of the target user line.
//
//   [3] If no candidate is found, it returns null.
textMarksFinder.prototype._getNextVisibleUserLineOfSameScene = function(userLine) {
  // [1]
  if (!userLine || userLine.visible) return userLine;

  // for loop is more efficient than (filter + find)
  var targetSceneNumber = userLine.eascLevel.scene;
  for (var i = userLine.index + 1; i < this.userLines.length; i++) {
    var it = this.userLines[i];

    // [3]
    // if we are not in the target scene anymore, then
    // there is not a visible user line
    if (it.eascLevel.scene !== targetSceneNumber) break;

    // [2]
    // if we are in the same scene and the line is visible,
    // this is the one we want
    if (it.visible) return it;
  }

  // [3]
  return null;
};

module.exports = textMarksFinder;
