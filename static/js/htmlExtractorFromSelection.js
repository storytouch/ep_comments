var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var utils = require('./utils');

exports.getHtmlOfSelectedContent = function() {
  var range = utils.getPadInner().get(0).getSelection().getRangeAt(0);
  var $copiedHtml = _createHiddenDiv(range);
  var onlyTextIsSelected = _selectionHasOnlyText($copiedHtml);

  // when the range selection is fully inside a tag, '$copiedHtml' will have no HTML tag, so we have to
  // build it. Ex: if we have '<span>ab<b>cdef</b>gh</span>" and user selects 'de', the value of
  // '$copiedHtml' will be 'de', not '<b>de</b>'
  if (onlyTextIsSelected) {
    $copiedHtml = _buildHtmlWithOuterTags($copiedHtml, range);
  }

  return $copiedHtml;
}

var _createHiddenDiv = function(range) {
  var content = range.cloneContents();
  var div = document.createElement('div');
  var hiddenDiv = $(div).html(content);
  return hiddenDiv;
}

var _selectionHasOnlyText = function($copiedHtml) {
  var html = $copiedHtml.html();
  var htmlDecoded = _htmlDecode(html);
  var text = $copiedHtml.text();
  return htmlDecoded === text;
}

// copied from https://css-tricks.com/snippets/javascript/unescape-html-in-js/
var _htmlDecode = function(input) {
  var e = document.createElement('div');
  e.innerHTML = input;
  return e.childNodes.length === 0 ? '' : e.childNodes[0].nodeValue;
}

var _buildHtmlWithOuterTags = function($copiedHtml, range) {
  var text = $copiedHtml.get(0).textContent;
  var htmlTemplate = _getHtmlTemplateWithAllTagsOfSelectedContent(range, text);
  return _splitSelectedTextIntoTwoSpans(text, htmlTemplate);
};

/*
  This function finds the entire DOM tree of the copied line, and returns an HTML
  with only one node containing children text nodes.
  For example, the line with selected text might have a DOM tree like this:

  <h1>
    <span>(...)</span>
    <span class="comment">
      <b>
        <i>
          "non-selected text"
          "selected"            \
          " "                    +--> the only part of the line that was selected
          "text"                /
          "non-selected text"
        </i>
      </b>
    </span>
    <span>(...)</span>
  </h1>

  The return value of this function should be a HTML with a DOM tree like this:

  <h1>
    <span class="comment">
      <b>
        <i>
          "non-selected text"
          "selected"
          " "
          "text"
          "non-selected text"
        </i>
      </b>
    </span>
  </h1>

  Note: the text nodes that are not selected will be removed later, on other
  parts of the code.
*/
var _getHtmlTemplateWithAllTagsOfSelectedContent = function(range, text) {
  // Get entire DOM tree on the line where selected text is.
  // ('.addBack': selected text might be a direct child of the item span)
  var $lineContent = $(range.commonAncestorContainer).parentsUntil('body > div').addBack().first();

  // Find positions on the line full text where selected text starts and ends
  var lineOffsets = _findSelectionOffsetsOnLine($lineContent, range);

  // We cannot mess with DOM of original content, create a copy of it to be
  // able to remove nodes later
  var $copyOfLineContent = $($lineContent.get(0).outerHTML);

  // Cleanup all nodes out of selected range
  $copyOfLineContent = _removeNodesOutOfOffsetRange($copyOfLineContent, lineOffsets);

  // All set! We now have a DOM tree with a single node containing children text nodes
  return $copyOfLineContent.get(0).outerHTML;
}

var _getTextNodesOf = function($content) {
  var $textNodes = $content.find('*').contents().filter(function() {
    return this.nodeType === Node.TEXT_NODE;
  });
  return $textNodes;
}

var _findSelectionOffsetsOnLine = function($lineContent, range) {
  var $textNodes = _getTextNodesOf($lineContent);

  // walk through the text nodes to find the offsets where selection starts and
  // ends on the line text
  var counter = 0;
  var startOffset, endOffset;
  $textNodes.each(function(index, element) {
    if (element === range.startContainer) {
      startOffset = counter + range.startOffset;
    }
    if (element === range.endContainer) {
      endOffset = counter + range.endOffset;
      // found both offsets, don't need to keep looking for it. Exit $.each
      return false;
    }

    var thisElementTextLength = element.textContent.length;
    counter += thisElementTextLength;
  });

  return {
    start: startOffset,
    end: endOffset,
  }
}

var _removeNodesOutOfOffsetRange = function($content, offsets) {
  var $textNodesOfCopiedContent = _getTextNodesOf($content);

  // step one: remove only text nodes
  var counter = 0;
  $textNodesOfCopiedContent.each(function(index, element) {
    var thisElementTextLength = element.textContent.length;
    var thisElementIsFullyBeforeRange = counter + thisElementTextLength <= offsets.start;
    var thisElementIsFullyAfterRange = counter >= offsets.end;

    if (thisElementIsFullyBeforeRange || thisElementIsFullyAfterRange) {
      element.remove();
    }

    counter = counter + thisElementTextLength;
  });

  // step two: remove all nodes with no text content -- their text nodes
  // were removed on previous step
  var $emptyNodesOfCopiedContent = $content.find('*').filter(function() {
    return $(this).text().length === 0;
  });
  $emptyNodesOfCopiedContent.remove();

  return $content;
}

// FIXME - Allow to copy an item when user copies only one char
/*
  This is a hack to preserve the item classes when user pastes an item.
  When user pastes a span like this: <span class='comment c-124'>thing</span>,
  chrome removes the classes and keeps only the style of the class.
  With comments, for example, chrome keeps the background-color. To avoid this
  we create two spans. The first one, <span class='comment c-124'>thi</span>
  has the text until the last but one character and second one with the last
  character <span class='comment c-124'>g</span>.
  Etherpad does a good job joining the two spans into one after the paste is
  triggered.
*/
var _splitSelectedTextIntoTwoSpans = function(text, itemSpanTemplate) {
  var $firstSpan = $(itemSpanTemplate);
  var $secondSpan = $(itemSpanTemplate);

  // '.find('*').last()': need to set text on the deepest tag
  // '.addBack()': itemSpanTemplate might not have any inner tag
  $firstSpan.find('*').addBack().last().text(text.slice(0, -1)); // text until before last char
  $secondSpan.find('*').addBack().last().text(text.slice(-1)); // last char
  return $('<span>' + $firstSpan.get(0).outerHTML + $secondSpan.get(0).outerHTML + '</span>');
}
