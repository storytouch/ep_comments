var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');

var detailedLinesChangedListener = require('ep_script_scene_marks/static/js/detailedLinesChangedListener');

var api                   = require('./api');
var linesChangedListener  = require('./linesChangedListener');
var textHighlighter       = require('./textHighlighter');
var textMarkIconsPosition = require('./textMarkIconsPosition');
var shared                = require('./shared');
var utils                 = require('./utils');
var scheduler             = require('./scheduler');
var textMarkSMVisibility  = require('./textMarkSMVisibility');

var COMMENT_HIGHLIGHT_COLOR = '#FFFACD';
var TIME_TO_UPDATE_ICON_POSITION = 1000;
var UPDATE_COMMENT_LINE_POSITION_EVENT = 'updateCommentLinePosition';

var commentIcons = function (ace) {
  this.ace = ace;
  this._insertContainer(); // create the container
  this.textHighlighter = textHighlighter.init('active_comment');
  this.textMarkSMVisibility = textMarkSMVisibility.init(ace);
  this.lineOfChange = undefined;
  this.textMarkIconsPosition = textMarkIconsPosition.init({
    hideIcons: this.hideIcons.bind(this),
    textMarkClass: utils.COMMENT_CLASS,
    textkMarkPrefix: shared.COMMENT_PREFIX,
    adjustTopOf: this.adjustTopOf.bind(this),
  });
  this._addListenersToUpdateIconStyle();
  this._addListenersToCommentIcons();
  this._addListenersToDeactivateComment();
  this._loadHelperLibs();
  this._listenToDifferentScenariosWhereIconPositionMightChange();
  api.setHandleCommentActivation(this._handleCommentActivation.bind(this));
}

// Adjust position of the comment icon on the container, to be on the same
// height of the pad text associated to the comment, and return the affected icon
commentIcons.prototype.adjustTopOf = function(commentId, baseTop) {
  var icon = utils.getPadOuter().find('#icon-' + commentId);
  var targetTop = baseTop + 2;
  var iconsAtLine = this._getOrCreateIconsContainerAt(targetTop);

  // move icon from one line to the other
  if (iconsAtLine != icon.parent()) icon.appendTo(iconsAtLine);

  icon.show();

  return icon;
}

// Hide comment icons from container
commentIcons.prototype.hideIcons = function(hideAllIcons) {
  var $commentIcons = utils.getPadOuter().find('#commentIcons').children().children();
  if (!hideAllIcons) {
    $commentIcons = $commentIcons.filter(this._iconDoesNotExistOnText); // get icons are not present on text
  }
  $commentIcons.hide();
}

// Create new comment icons, if they don't exist yet
commentIcons.prototype.addIcons = function(comments) {
  for(var commentId in comments) {
    this._addIcon(commentId);
  }

  this._updateCommentIconsStyle();
}

commentIcons.prototype._updateIconsPositionAffectedByTheLineChange = function() {
  this.textMarkIconsPosition.updateIconsPosition(false, this.lineOfChange);
  this.lineOfChange = undefined; // reset value
}

commentIcons.prototype.updateAllIconsPosition = function() {
  this.textMarkIconsPosition.updateIconsPosition(true);
}

commentIcons.prototype._listenToDifferentScenariosWhereIconPositionMightChange = function () {
  var self = this;

  // to avoid lagging while user is typing, we set a scheduler to postpone
  // calling callback until edition had stopped
  this.updateIconsPositionSchedule = scheduler.setCallbackWhenUserStopsChangingPad(
    self._updateIconsPositionAffectedByTheLineChange.bind(self),
    TIME_TO_UPDATE_ICON_POSITION
  );

  detailedLinesChangedListener.onLinesAddedOrRemoved(function(linesChanged) {
    self._updateMinLineChanged(linesChanged.linesNumberOfChangedNodes);
    self.updateIconsPositionSchedule.padChanged();
  }, true, this._getRep());

  // When screen size changes (user changes device orientation, for example),
  // we need to make sure all sidebar comments are on the correct place
  utils.waitForResizeToFinishThenCall(200, function() {
    self.updateAllIconsPosition();
  });

  // Allow recalculating the comments position by event
  utils.getPadInner().on(UPDATE_COMMENT_LINE_POSITION_EVENT, function(e) {
    self.updateAllIconsPosition();
  });
}

commentIcons.prototype._getRep = function() {
  var rep;
  this.ace.callWithAce(function(ace) {
    rep = ace.ace_getRep();
  });
  return rep;
}

commentIcons.prototype._updateMinLineChanged = function(linesChangedOnThisBatch) {
  var topLineChangedOnThisBatch = _.min(linesChangedOnThisBatch);
  this.lineOfChange = _.min([topLineChangedOnThisBatch, this.lineOfChange]);
}

// Create container to hold comment icons
commentIcons.prototype._insertContainer = function() {
  utils.getPadOuter().find("#sidediv").after('<div id="commentIcons"></div>');
}

commentIcons.prototype._addListenersToCommentIcons = function() {
  var self = this;

  utils.getPadOuter().find('#commentIcons').on("mouseover", ".comment-icon.inactive", function(e){
    var commentId = self._targetCommentIdOf(e);
    self._highlightTargetTextOf(commentId);
  }).on("mouseout", ".comment-icon.inactive", function(e){
    var commentId = self._targetCommentIdOf(e);
    self._removeHighlightOfTargetTextOf(commentId);
  }).on("click", ".comment-icon.active", function(e){
    self._toggleActiveCommentIcon($(this));
    var commentId = self._targetCommentIdOf(e);
    self._removeHighlightOfTargetTextOf(commentId);
    api.triggerCommentDeactivation();
  }).on("click", ".comment-icon.inactive", function(e){
    // deactivate/hide other comment boxes that are opened, so we have only
    // one comment box opened at a time
    var allActiveIcons = utils.getPadOuter().find('#commentIcons').find(".comment-icon.active");
    self._toggleActiveCommentIcon(allActiveIcons);
    self._removeHighlightOfAllComments();

    // activate/show only target comment
    self._toggleActiveCommentIcon($(this));
    var commentId = self._targetCommentIdOf(e);

    // if a comment is on a scene mark hidden, show the scene mark first
    self.textMarkSMVisibility.showSMHiddenIfTextMarkIsOnIt(commentId);

    self._highlightTargetTextOf(commentId);
    self._placeCaretAtBeginningOfTextOf(commentId);
    api.triggerCommentActivation(commentId);
  });
}


commentIcons.prototype._getOrCreateIconsContainerAt = function(top) {
  var iconContainer = utils.getPadOuter().find('#commentIcons');
  var iconClass = "icon-at-" + top;

  // is this the 1st comment on that line?
  var iconsAtLine = iconContainer.find("." + iconClass);
  var isFirstIconAtLine = iconsAtLine.length === 0;

  // create container for icons at target line, if it does not exist yet
  if (isFirstIconAtLine) {
    iconContainer.append('<div class="comment-icon-line ' + iconClass + '"></div>');
    iconsAtLine = iconContainer.find("." + iconClass);
    iconsAtLine.css("top", top + "px");
  }

  return iconsAtLine;
}

commentIcons.prototype._addIcon = function(commentId) {
  // only create icon if it was not created before
  var $icon = utils.getPadOuter().find('#icon-' + commentId);
  if ($icon.length > 0) return;

  // only create icon if commented text was not removed from pad
  var $inlineComment = utils.getPadInner().find('.comment.' + commentId);
  if ($inlineComment.length === 0) return;

  var top = $inlineComment.get(0).offsetTop + 2;
  var iconsAtLine = this._getOrCreateIconsContainerAt(top);
  var icon = $('#commentIconTemplate').tmpl({ commentId: commentId });

  icon.appendTo(iconsAtLine);
}

// Update which comments have reply
commentIcons.prototype._updateCommentIconsStyle = function() {
  var commentDataManager = pad.plugins.ep_comments_page.commentHandler.commentDataManager;
  var $iconsContainer = utils.getPadOuter().find('#commentIcons');
  var $commentsOnText = utils.getPadInner().find('.comment');

  $commentsOnText.each(function() {
    var commentId = shared.getCommentIdsFrom($(this).attr('class'));

    // ignore comments without a valid id -- maybe comment was deleted?
    if (commentId) {
      var replies = commentDataManager.getRepliesOfComment(commentId);

      // comment can have reply data, but the reply might have been
      // removed from text (by UNDO, for example)
      var selectorOfAllReplyIds = _(replies).map(function(reply) {
        return '.' + reply.replyId;
      }).join(',');
      var commentHasReplyOnText = $(this).is(selectorOfAllReplyIds);

      // change comment icon
      var $commentIcon = $iconsContainer.find('#icon-' + commentId);
      $commentIcon.toggleClass('withReply', commentHasReplyOnText);
    }
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

commentIcons.prototype._addListenersToUpdateIconStyle = function() {
  linesChangedListener.onLineChanged('.comment-reply', this._updateCommentIconsStyle);
}

// Listen to clicks on the page to be able to close comment when clicking
// outside of it
commentIcons.prototype._addListenersToDeactivateComment = function() {
  var self = this;

  // we need to add listeners to the different iframes of the page
  $(document).on("touchstart click", function(e){
    self._deactivateCommentIfNotOnSelectedElements(e);
  });
  utils.getPadOuter().find('html').on("touchstart click", function(e){
    self._deactivateCommentIfNotOnSelectedElements(e);
  });
  utils.getPadInner().find('html').on("touchstart click", function(e){
    self._deactivateCommentIfNotOnSelectedElements(e);
  });
}

// Close comment if event target was on a comment icon
commentIcons.prototype._deactivateCommentIfNotOnSelectedElements = function(e) {
  if (this._shouldNotCloseComment(e)) return;

  // All clear, can close the comment
  var openedComment = this._findOpenedComment();
  if (openedComment) {
    this._toggleActiveCommentIcon($(openedComment));
    this._removeHighlightOfAllComments();
    api.triggerCommentDeactivation();
  }
}

// Indicates if event was on one of the elements that does not close comment (any of the comment icons)
commentIcons.prototype._shouldNotCloseComment = function(e) {
  return $(e.target).closest('.comment-icon').length !== 0;
}

// Search on the page for an opened comment
commentIcons.prototype._findOpenedComment = function() {
  return utils.getPadOuter().find('#commentIcons .comment-icon.active').get(0);
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
  utils.getPadOuter().find('#commentIcons .active').click();
}
// Click on comment icon, so the whole cycle of events is performed
commentIcons.prototype._triggerCommentActivation = function(commentId) {
  var $commentIcon = utils.getPadOuter().find('#commentIcons #icon-' + commentId);

  // make sure icon is visible on viewport
  var outerIframe = $('iframe[name="ace_outer"]').get(0);
  outerIframe.contentWindow.scrollIntoView($commentIcon.get(0));

  // ".inactive": comment is already active, don't need to be activated
  $commentIcon.filter('.inactive').click();
}

commentIcons.prototype._iconDoesNotExistOnText = function() {
  var commentId = $(this).data('commentid');
  var commentExistsOnText = utils.getPadInner().find('.' + commentId).length;
  return !commentExistsOnText;
}

exports.init = function(ace) {
  return new commentIcons(ace);
}
