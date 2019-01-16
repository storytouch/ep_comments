var _ = require('ep_etherpad-lite/static/js/underscore');
var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var smUtils = require('ep_script_scene_marks/static/js/utils');

exports.LINE_CHANGED_EVENT = 'LINE_CHANGED_EVENT';
exports.OPEN_NEW_COMMENT_MODAL_EVENT = 'OPEN_NEW_COMMENT_MODAL_EVENT';
exports.COMMENT_CLASS = '.comment';

// Easier access to outer pad
var padOuter;
exports.getPadOuter = function() {
  padOuter = padOuter || $('iframe[name="ace_outer"]').contents();
  return padOuter;
}

// Easier access to inner pad
var padInner;
exports.getPadInner = function() {
  padInner = padInner || this.getPadOuter().find('iframe[name="ace_inner"]').contents();
  return padInner;
}

exports.getOuterWindow = function() {
  var outerIframe = $('iframe[name="ace_outer"]').get(0);
  return outerIframe && outerIframe.contentWindow;
}

// Some browsers trigger resize several times while resizing the window, so
// we need to make sure resize is done to avoid calling the callback multiple
// times.
// Based on: https://css-tricks.com/snippets/jquery/done-resizing-event/
exports.waitForResizeToFinishThenCall = function(timeout, callback) {
  var resizeTimer;
  $(window).on('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(callback, timeout);
  });
}

/*
   input: comments = {
    'c-abc': {..., replies: { 'cr-123': {...}} },
    'c-def': {..., replies: { 'cr-456': {...}} },
   }

   output: {
    'cr-123': {...},
    'cr-456': {...},
   }
*/
exports.getRepliesIndexedByReplyId = function(comments) {
  return _.chain(comments)
    .pluck('replies') // array of hashes: [{ 'cr-123': {...} }, { 'cr-456': {...} }]
    .reduce(function(repliesIndexedById, replyPair) {
      return Object.assign(repliesIndexedById, replyPair)
    }, {}) // hash indexed by replyId: { 'cr-123': {...}, 'cr-456': {...} }
    .value();
};

exports.getUserInfo = function() {
  var userName = clientVars.userName || '';
  return {
    initials: exports.buildUserInitials(userName),
    name: userName,
  }
}

exports.buildUserInitials = function(name) {
  var names = name.trim().split(' ');
  var thereIsALastName = names.length > 1;

  var firstInitial = names[0][0];
  var lastInitial = thereIsALastName ? names[names.length - 1][0] : names[0][1];
  var userInitials = (firstInitial || '') + (lastInitial || '');

  return userInitials.toUpperCase();
};

exports.openSocketConnectionToRoute = function(routePath) {
  // Required for instances running on weird ports
  // This probably needs some work for instances running on root or not on /p/
  var loc = document.location;
  var port = loc.port == '' ? (loc.protocol == 'https:' ? 443 : 80) : loc.port;
  var url = loc.protocol + '//' + loc.hostname + ':' + port + routePath;
  return io.connect(url);
}

exports.getHeadingOfDomLine = function($line) {
  if ($line.is('div.withHeading')) {
    return $line;
  } else if (smUtils.checkIfHasSceneMark($line)) {
    return $line.nextUntil('div.withHeading').addBack().last().next();
  } else {
    return $line.prevUntil('div.withHeading').addBack().first().prev();
  }
}

exports.setAttributeOnSelections = function(selector, attributeName, attributeValue, ace) {
  var repArr = ace.ace_getRepFromSelector(selector);
  setAttributeOnRepArray(repArr, attributeName, attributeValue, ace);
}

var setAttributeOnRepArray = function(repArr, attributeName, attributeValue, ace) {
  // repArr is an array of reps.. I will need to iterate over each to do something meaningful..
  _(repArr).each(function(rep) {
    ace.ace_performSelectionChange(rep[0], rep[1], true);
    ace.ace_setAttributeOnSelection(attributeName, attributeValue);
  });

  selectFullTextOfRepArray(repArr, ace);
}
exports.setAttributeOnRepArray = setAttributeOnRepArray;

var selectFullTextOfRepArray = function(repArr, ace) {
  if (repArr.length === 0) return;

  var firstSelectedPart = repArr[0];
  var lastSelectedPart  = repArr[repArr.length - 1];

  var beginningOfSelection = firstSelectedPart[0];
  var endOfSelection       = lastSelectedPart[1];

  ace.ace_performSelectionChange(beginningOfSelection, endOfSelection, true);
}
exports.selectFullTextOfRepArray = selectFullTextOfRepArray;

exports.replaceDialogContentWith = function($template, dialog, selector) {
  // replace content on the original dialog
  var selectorId = '#' + selector;
  var $currentContent = dialog.$content.find(selectorId);
  var $newContent = $template.find(selectorId);
  $currentContent.replaceWith($newContent);
}
