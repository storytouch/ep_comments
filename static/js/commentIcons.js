var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');

var simplePageViewUtils = require('ep_script_simple_page_view/static/js/utils');

var textHighlighter      = require('./textHighlighter');
var textMarksObserver    = require('./textMarksObserver');
var shared               = require('./shared');
var utils                = require('./utils');
var textMarkSMVisibility = require('./textMarkSMVisibility');

// make sure $.tmpl is loaded
require('./lib/jquery.tmpl.min');

var COMMENT_HIGHLIGHT_COLOR = '#FFFACD';
var FIRST_LINE_OF_PAD = 0;
var TIME_TO_UPDATE_ICON_POSITION = 100; // milliseconds

var commentIcons = function(ace) {
  // allow to control this timeout in test
  this.timeToUpdateIconPosition = TIME_TO_UPDATE_ICON_POSITION;

  this.thisPlugin = pad.plugins.ep_comments_page;
  this.editorPaddingTop = simplePageViewUtils.getEditorPaddingTop();
  this.thisPlugin.textMarksObserver = textMarksObserver.init(ace);
  this.commentInfoDialog = this.thisPlugin.commentInfoDialog;
  this.$iconsContainer = this._createIconsContainer();
  this.textHighlighter = textHighlighter.init('active_comment');
  this.textMarkSMVisibility = textMarkSMVisibility.init(ace);

  this._addListenersToCommentIcons();
  this._addListenersToDeactivateComment();
  this._loadHelperLibs();
  this._initializeIcons();
  this.thisPlugin.api.setHandleCommentActivation(this._handleCommentActivation.bind(this));
}

commentIcons.prototype.updateIconPositions = function(textMarkOccurrences, lineOfChange) {
  var updateAllIcons = lineOfChange === FIRST_LINE_OF_PAD;
  this._hideIcons(textMarkOccurrences, updateAllIcons);
  this._processNewTextMarkOccurrences(textMarkOccurrences);
  this._updateCommentIconsStyle();
}

commentIcons.prototype._initializeIcons = function() {
  // build initial set of icons
  var textMarkOccurrences = this.thisPlugin.commentDataManager.getTextMarkOccurrencesOnText();
  this._processNewTextMarkOccurrences(textMarkOccurrences);
  this._updateCommentIconsStyle();
}

commentIcons.prototype._processNewTextMarkOccurrences = function(textMarkOccurrences) {
  var self = this;

  var comments = _(textMarkOccurrences)
    .chain()
    .values()
    .filter(function(textMarkOccurrence) {
      // does not process deleted comments and comments
      // whose user line was not calculated yet
      var isCommentDeleted = textMarkOccurrence.value === 'comment-deleted';
      var isCommentUserLineExisting = !!textMarkOccurrence.position.userLineOfOccurrence;
      return !isCommentDeleted && isCommentUserLineExisting;
    })
    .value();

  // to avoid processing overhead, perform this task in blocks
  var chunkSize = 10;
  var interval = this.timeToUpdateIconPosition;

  let i, j, k = 0;
  for (i = 0, j = comments.length; i < j; i += chunkSize) {
    let chunk = comments.slice(i, i + chunkSize);
    setTimeout(function() {
      chunk.forEach(function(commentOccurrence) {
        self._placeIconOnPosition(commentOccurrence);
      });
    }, interval * k);
  }
};

// Create container to hold comment icons
commentIcons.prototype._createIconsContainer = function() {
  var $iconsContainer = $('<div id="commentIcons"></div>');
  utils.getPadOuter().find("#sidediv").after($iconsContainer);
  return $iconsContainer;
}

commentIcons.prototype._addListenersToCommentIcons = function() {
  var self = this;

  this.$iconsContainer.on("mouseover", ".comment-icon.inactive", function(e){
    var commentId = self._targetCommentIdOf(e);
    self._highlightTargetTextOf(commentId);
  }).on("mouseout", ".comment-icon.inactive", function(e){
    var commentId = self._targetCommentIdOf(e);
    self._removeHighlightOfTargetTextOf(commentId);
  }).on("click", ".comment-icon.active", function(e){
    self._toggleActiveCommentIcon($(this));
    var commentId = self._targetCommentIdOf(e);
    self._removeHighlightOfTargetTextOf(commentId);
    self.thisPlugin.api.triggerCommentDeactivation();
  }).on("click", ".comment-icon.inactive", function(e){
    // deactivate/hide other comment boxes that are opened, so we have only
    // one comment box opened at a time
    var allActiveIcons = self.$iconsContainer.find(".comment-icon.active");
    self._toggleActiveCommentIcon(allActiveIcons);
    self._removeHighlightOfAllComments();

    // activate/show only target comment
    self._toggleActiveCommentIcon($(this));
    var commentId = self._targetCommentIdOf(e);

    // if a comment is on a scene mark hidden, show the scene mark first
    self.textMarkSMVisibility.showSMHiddenIfTextMarkIsOnIt(commentId);

    self._highlightTargetTextOf(commentId);
    self._placeCaretAtBeginningOfTextOf(commentId);
    self.thisPlugin.api.triggerCommentActivation(commentId);
  });
}

commentIcons.prototype._getOrCreateIconsContainerAt = function(top) {
  var iconClass = "icon-at-" + top;

  // is this the 1st comment on that line?
  var iconsAtLine = this.$iconsContainer.find("." + iconClass);
  var isFirstIconAtLine = iconsAtLine.length === 0;

  // create container for icons at target line, if it does not exist yet
  if (isFirstIconAtLine) {
    this.$iconsContainer.append('<div class="comment-icon-line ' + iconClass + '"></div>');
    iconsAtLine = this.$iconsContainer.find("." + iconClass);
    iconsAtLine.css("top", top + "px");
  }

  return iconsAtLine;
}

commentIcons.prototype._getOrCreateIcon = function(commentId) {
  var $icon = this.$iconsContainer.find('#icon-' + commentId);

  var iconDoesNotExistYet = $icon.length === 0;
  if (iconDoesNotExistYet) {
    $icon = $('#commentIconTemplate').tmpl({ commentId: commentId });
  }

  return $icon;
}

// Adjust position of the comment icon on the container, to be on the same
// height of the pad text associated to the comment, and return the affected icon
commentIcons.prototype._placeIconOnPosition = function(textMarkOccurrence) {
  var commentId = this._getCommentIdFromTextMarkOccurrence(textMarkOccurrence);
  var $icon = this._getOrCreateIcon(commentId);

  // If there is no a visible user line suitable to place the icon,
  // then we need to hide it.
  // It cover cases where icons are on a script element and a user
  // changes the EASC visibility, which may hide the line where the
  // icon was.
  // When the icon is on a SceneMark and ScriptElements are visible,
  // `nextVisibleUserLine` already points to the next Heading.
  var nextVisibleUserLine = textMarkOccurrence.position.nextVisibleUserLine;
  if (!nextVisibleUserLine) {
    $icon.hide();
    return;
  }

  // move icon from one line to the other
  var top = this._getCommentTopPositionFromTextMarkOccurrence(textMarkOccurrence);
  var iconsAtLine = this._getOrCreateIconsContainerAt(top);
  if (iconsAtLine != $icon.parent()) $icon.appendTo(iconsAtLine);

  $icon.show();

  return $icon;
}

// Hide comment icons from container
commentIcons.prototype._hideIcons = function(textMarkOccurrences, hideAllIcons) {
  var self = this;
  var $commentIcons = this.$iconsContainer.children().children();
  if (!hideAllIcons) {
    // get icons are not present on text
    $commentIcons = $commentIcons.filter(function() {
      var $icon = $(this);
      return self._iconDoesNotExistOnText(textMarkOccurrences, $icon);
    });
  }
  $commentIcons.hide();
}


// Update which comments have reply
commentIcons.prototype._updateCommentIconsStyle = function() {
  var self = this;
  var commentDataManager = this.thisPlugin.commentDataManager;
  var $commentsOnText = utils.getPadInner().find('.comment');

  $commentsOnText.each(function() {
    var commentIds = shared.getCommentIdsFrom($(this).attr('class'));
    var $comment = $(this);
    commentIds.forEach(function(commentId) {
      var replies = commentDataManager.getRepliesOfComment(commentId);

      // comment can have reply data, but the reply might have been
      // removed from text (by UNDO, for example)
      var selectorOfAllReplyIds = _(replies).map(function(reply) {
        return '.' + reply.replyId;
      }).join(',');
      var commentHasReplyOnText = $comment.is(selectorOfAllReplyIds);

      // change comment icon
      var $commentIcon = self.$iconsContainer.find('#icon-' + commentId);
      $commentIcon.toggleClass('withReply', commentHasReplyOnText);
    })
  });
}

commentIcons.prototype._targetCommentIdOf = function(e) {
  return e.currentTarget.getAttribute("data-commentid");
}

commentIcons.prototype._highlightTargetTextOf = function(commentId) {
  this.textHighlighter.highlightTargetTextOf(commentId, COMMENT_HIGHLIGHT_COLOR);
}

commentIcons.prototype._removeHighlightOfTargetTextOf = function(commentId) {
  this.textHighlighter.removeHighlightOfTargetTextOf(commentId)
}

commentIcons.prototype._removeHighlightOfAllComments = function() {
  this.textHighlighter.removeHighlightOfAllTextMarks();
}

commentIcons.prototype._toggleActiveCommentIcon = function(target) {
  target.toggleClass("active").toggleClass("inactive");
}

commentIcons.prototype._placeCaretAtBeginningOfTextOf = function(commentId) {
  var beginningOfComment = utils.getPadInner().find('.comment.' + commentId).get(0);
  var selection = utils.getPadInner().get(0).getSelection();
  var range = selection.getRangeAt(0);

  range.setStart(beginningOfComment, 0);
  range.setEnd(beginningOfComment, 0);

  selection.removeAllRanges();
  selection.addRange(range);

  // when user clicks on the icon, the editor (padInner) looses focus, so user cannot
  // start typing right away. Force focus to be on editor to avoid that.
  this._makeSureEditorHasTheFocus();
}

commentIcons.prototype._makeSureEditorHasTheFocus = function() {
  utils.getPadOuter().find('iframe[name="ace_inner"]').get(0).contentWindow.focus();
}

// Listen to clicks on the page to be able to close comment when clicking
// outside of it
commentIcons.prototype._addListenersToDeactivateComment = function() {
  var self = this;

  var handleClick = function(e) {
    self._deactivateCommentIfNotOnSelectedElements(e);
    self._closeCommentInfoDialogIfClickOutside(e);
  }

  // we need to add listeners to the different iframes of the page
  $(document).on('touchstart click', handleClick);
  utils.getPadOuter().find('html').on('touchstart click', handleClick);
  utils.getPadInner().find('html').on('touchstart click', handleClick);
}

commentIcons.prototype._closeCommentInfoDialogIfClickOutside = function(e) {
  if (this._eventTargetIsCommentInfoDialog(e)) return;

  // All clear, can close the dialog
  this.commentInfoDialog.hideCommentInfoDialog();
}

commentIcons.prototype._eventTargetIsCommentInfoDialog = function(e) {
  return this.commentInfoDialog.eventTargetIsACommentInfoDialog(e);
}

// Close comment if event target was on a comment icon
commentIcons.prototype._deactivateCommentIfNotOnSelectedElements = function(e) {
  if (this._shouldNotCloseComment(e)) return;

  // All clear, can close the comment
  var openedComment = this._findOpenedComment();
  if (openedComment) {
    this._toggleActiveCommentIcon($(openedComment));
    this._removeHighlightOfAllComments();
    this.thisPlugin.api.triggerCommentDeactivation();
  }
}

// Indicates if event was on one of the elements that does not close comment (any of the comment icons)
commentIcons.prototype._shouldNotCloseComment = function(e) {
  return $(e.target).closest('.comment-icon').length !== 0 || this._eventTargetIsCommentInfoDialog(e);
}

// Search on the page for an opened comment
commentIcons.prototype._findOpenedComment = function() {
  return this.$iconsContainer.find('.comment-icon.active').get(0);
}

commentIcons.prototype._loadHelperLibs = function() {
  // we must load this script on padOuter, otherwise it won't handle the scroll on
  // padOuter.contentWindow, but on padChrome.window instead
  var outerIframe = $('iframe[name="ace_outer"]').get(0);
  var outerDoc = outerIframe.contentDocument;
  var script = outerDoc.createElement('script');
  script.type = 'text/javascript';
  script.src = '../static/plugins/ep_comments_page/static/js/lib/scrollIntoView.min.js';
  outerDoc.body.appendChild(script);
}

// Handle when an external message asks for a comment to be activated.
commentIcons.prototype._handleCommentActivation = function(commentId) {
  if (commentId) {
    this._triggerCommentActivation(commentId);
  } else {
    this._triggerCommentDeactivation();
  }
}

commentIcons.prototype._triggerCommentDeactivation = function() {
  this.$iconsContainer.find('.active').click();
}
// Click on comment icon, so the whole cycle of events is performed
commentIcons.prototype._triggerCommentActivation = function(commentId) {
  var $commentIcon = this.$iconsContainer.find('#icon-' + commentId);

  // make sure icon is visible on viewport
  var outerIframe = $('iframe[name="ace_outer"]').get(0);
  outerIframe.contentWindow.scrollIntoView($commentIcon.get(0));

  // ".inactive": comment is already active, don't need to be activated
  $commentIcon.filter('.inactive').click();
}

commentIcons.prototype._iconDoesNotExistOnText = function(textMarkOccurrences, $icon) {
  var commentId = $icon.data('commentid');
  var matchedOccurrence = textMarkOccurrences[commentId];
  return !matchedOccurrence;
}

commentIcons.prototype._getCommentIdFromTextMarkOccurrence = function(textMarkOccurrence) {
  var commentKey = textMarkOccurrence.key;
  return commentKey.replace(shared.COMMENT_PREFIX_KEY, shared.COMMENT_PREFIX);
}

commentIcons.prototype._getCommentTopPositionFromTextMarkOccurrence = function(textMarkOccurrence) {
  var nextVisibleUserLine = textMarkOccurrence.position.nextVisibleUserLine;
  if (!nextVisibleUserLine) return 0;

  var baseTop = this.editorPaddingTop + nextVisibleUserLine.y0 + nextVisibleUserLine.marginTop;
  return baseTop + 3;
}

exports.init = function(ace) {
  return new commentIcons(ace);
}
