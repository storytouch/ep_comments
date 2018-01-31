var $ = require('ep_etherpad-lite/static/js/rjquery').$;

var utils = require('ep_comments_page/static/js/utils');
var api = require('ep_comments_page/static/js/api');
var sceneMarkVisibility = require('ep_script_scene_marks/static/js/sceneMarkVisibility');
var smUtils = require('ep_script_scene_marks/static/js/utils');
var linesChangedListener = require('./linesChangedListener');

var getOrCreateIconsContainerAt = function(top) {
  var iconContainer = utils.getPadOuter().find('#commentIcons');
  var iconClass = "icon-at-"+top;

  // is this the 1st comment on that line?
  var iconsAtLine = iconContainer.find("."+iconClass);
  var isFirstIconAtLine = iconsAtLine.length === 0;

  // create container for icons at target line, if it does not exist yet
  if (isFirstIconAtLine) {
    iconContainer.append('<div class="comment-icon-line '+iconClass+'"></div>');
    iconsAtLine = iconContainer.find("."+iconClass);
    iconsAtLine.css("top", top+"px");
  }

  return iconsAtLine;
}

var targetCommentIdOf = function(e) {
  return e.currentTarget.getAttribute("data-commentid");
}

var highlightTargetTextOf = function(commentId) {
  utils.getPadInner().find("head").append("<style>."+commentId+"{ background: #FFFACD !important }</style>");
}
var removeHighlightOfTargetTextOf = function(commentId) {
  utils.getPadInner().find("head").append("<style>."+commentId+"{ background: none !important }</style>");
}
var removeHighlightOfAllComments = function() {
  utils.getPadInner().find("head").append("<style>.comment{ background: none !important }</style>");
}

var toggleActiveCommentIcon = function(target) {
  target.toggleClass("active").toggleClass("inactive");
}

var placeCaretAtBeginningOfTextOf = function(commentId) {
  var beginningOfComment = utils.getPadInner().find('.comment.' + commentId).get(0);
  var selection = utils.getPadInner().get(0).getSelection();
  var range = selection.getRangeAt(0);

  range.setStart(beginningOfComment, 0);
  range.setEnd(beginningOfComment, 0);

  selection.removeAllRanges();
  selection.addRange(range);

  // when user clicks on the icon, the editor (padInner) looses focus, so user cannot
  // start typing right away. Force focus to be on editor to avoid that.
  makeSureEditorHasTheFocus();
}

var makeSureEditorHasTheFocus = function() {
  utils.getPadOuter().find('iframe[name="ace_inner"]').get(0).contentWindow.focus();
}

var addListenersToUpdateIconStyle = function() {
  linesChangedListener.onLineChanged('.comment-reply', updateCommentIconsStyle);
}

var addListenersToCommentIcons = function(ace) {
  utils.getPadOuter().find('#commentIcons').on("mouseover", ".comment-icon.inactive", function(e){
    var commentId = targetCommentIdOf(e);
    highlightTargetTextOf(commentId);
  }).on("mouseout", ".comment-icon.inactive", function(e){
    var commentId = targetCommentIdOf(e);
    removeHighlightOfTargetTextOf(commentId);
  }).on("click", ".comment-icon.active", function(e){
    toggleActiveCommentIcon($(this));
    var commentId = targetCommentIdOf(e);
    removeHighlightOfTargetTextOf(commentId);
    api.triggerCommentDeactivation();
  }).on("click", ".comment-icon.inactive", function(e){
    // deactivate/hide other comment boxes that are opened, so we have only
    // one comment box opened at a time
    var allActiveIcons = utils.getPadOuter().find('#commentIcons').find(".comment-icon.active");
    toggleActiveCommentIcon(allActiveIcons);
    removeHighlightOfAllComments();

    // activate/show only target comment
    toggleActiveCommentIcon($(this));
    var commentId = targetCommentIdOf(e);

    // if a comment is on a scene mark hidden, show the scene mark first
    ace.callWithAce(function(ace){
      ace.ace_showSMHiddenIfCommentIsOnIt(commentId);
    });

    highlightTargetTextOf(commentId);
    placeCaretAtBeginningOfTextOf(commentId);
    api.triggerCommentActivation(commentId);
  });
}

exports.showSMHiddenIfCommentIsOnIt = function(commentId) {
  var commentIsOnSceneMarkHidden = isCommentOnSceneMarkHidden(commentId);

  if (commentIsOnSceneMarkHidden) {
    var rep = this.rep;
    var editorInfo = this.editorInfo;
    var attributeManager = this.documentAttributeManager;
    var firstLineWhereCommentIsApplied = getFirstLineWhereCommentIsApplied(commentId, rep);
    sceneMarkVisibility.showSceneMarksAroundLine(firstLineWhereCommentIsApplied, editorInfo, attributeManager);
  }
}

var isCommentOnSceneMarkHidden = function(commentId) {
  var $linesWhereCommentIsApplied = utils.getPadInner().find('div').has('.' + commentId);
  var commmentIsAppliedOnlyOnSceneMark = _.every($linesWhereCommentIsApplied, function(line){
    return smUtils.checkIfHasSceneMark($(line));
  });
  return commmentIsAppliedOnlyOnSceneMark && linesAreHidden($linesWhereCommentIsApplied);
}

var linesAreHidden = function($lines) {
  return _.every($lines, function(line){
    var isLineVisible = line.getBoundingClientRect().height;
    return !isLineVisible;
  });
}

var getFirstLineWhereCommentIsApplied = function(commentId, rep) {
  var $line = utils.getPadInner().find('div').has('.' + commentId).first();
  return getLineNumberFromDOMLine($line, rep);
}

var getLineNumberFromDOMLine = function($line, rep) {
  var lineId = $line.attr("id");
  var lineNumber = rep.lines.indexOfKey(lineId);

  return lineNumber;
}

// Listen to clicks on the page to be able to close comment when clicking
// outside of it
var addListenersToDeactivateComment = function() {
  // we need to add listeners to the different iframes of the page
  $(document).on("touchstart click", function(e){
    deactivateCommentIfNotOnSelectedElements(e);
  });
  utils.getPadOuter().find('html').on("touchstart click", function(e){
    deactivateCommentIfNotOnSelectedElements(e);
  });
  utils.getPadInner().find('html').on("touchstart click", function(e){
    deactivateCommentIfNotOnSelectedElements(e);
  });
}

// Close comment if event target was on a comment icon
var deactivateCommentIfNotOnSelectedElements = function(e) {
  if (shouldNotCloseComment(e)) return;

  // All clear, can close the comment
  var openedComment = findOpenedComment();
  if (openedComment) {
    toggleActiveCommentIcon($(openedComment));
    removeHighlightOfAllComments();
    api.triggerCommentDeactivation();
  }
}

// Search on the page for an opened comment
var findOpenedComment = function() {
  return utils.getPadOuter().find('#commentIcons .comment-icon.active').get(0);
}

var loadHelperLibs = function() {
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
var handleCommentActivation = function(commentId) {
  if (commentId) {
    triggerCommentActivation(commentId);
  } else {
    triggerCommentDeactivation();
  }
}

var triggerCommentDeactivation = function() {
  utils.getPadOuter().find('#commentIcons .active').click();
}
// Click on comment icon, so the whole cycle of events is performed
var triggerCommentActivation = function(commentId) {
  var $commentIcon = utils.getPadOuter().find('#commentIcons #icon-' + commentId);

  // make sure icon is visible on viewport
  var outerIframe = $('iframe[name="ace_outer"]').get(0);
  outerIframe.contentWindow.scrollIntoView($commentIcon.get(0));

  // ".inactive": comment is already active, don't need to be activated
  $commentIcon.filter('.inactive').click();
}

/* ***** Public methods: ***** */

// Create container to hold comment icons
var insertContainer = function(ace) {
  utils.getPadOuter().find("#sidediv").after('<div id="commentIcons"></div>');

  addListenersToUpdateIconStyle();
  addListenersToCommentIcons(ace);
  addListenersToDeactivateComment();
  loadHelperLibs();

  api.setHandleCommentActivation(handleCommentActivation);
}

// Create new comment icons, if they don't exist yet
var addIcons = function(comments) {
  for(var commentId in comments) {
    addIcon(commentId);
  }

  updateCommentIconsStyle();
}

var addIcon = function(commentId) {
  // only create icon if it was not created before
  var $icon = utils.getPadOuter().find('#icon-' + commentId);
  if ($icon.length > 0) return;

  // only create icon if commented text was not removed from pad
  var $inlineComment = utils.getPadInner().find('.comment.' + commentId);
  if ($inlineComment.length === 0) return;

  var top = $inlineComment.get(0).offsetTop + 2;
  var iconsAtLine = getOrCreateIconsContainerAt(top);
  var icon = $('#commentIconTemplate').tmpl({ commentId: commentId });

  icon.appendTo(iconsAtLine);
}

// Hide comment icons from container
var hideIcons = function() {
  utils.getPadOuter().find('#commentIcons').children().children().each(function(){
    $(this).hide();
  });
}

// Adjust position of the comment icon on the container, to be on the same
// height of the pad text associated to the comment, and return the affected icon
var adjustTopOf = function(commentId, baseTop) {
  var icon = utils.getPadOuter().find('#icon-' + commentId);
  var targetTop = baseTop + 2;
  var iconsAtLine = getOrCreateIconsContainerAt(targetTop);

  // move icon from one line to the other
  if (iconsAtLine != icon.parent()) icon.appendTo(iconsAtLine);

  icon.show();

  return icon;
}

// Update which comments have reply
var updateCommentIconsStyle = function() {
  var $iconsContainer = utils.getPadOuter().find('#commentIcons');
  var $commentsOnText = utils.getPadInner().find('.comment');

  $commentsOnText.each(function() {
    var classCommentId = /(?:^| )(c-[A-Za-z0-9]*)/.exec($(this).attr('class'));
    var commentId = classCommentId && classCommentId[1];

    // ignore comments without a valid id -- maybe comment was deleted?
    if (commentId) {
      var commentHasReply = $(this).hasClass('comment-reply');
      // change comment icon
      var $commentIcon = $iconsContainer.find('#icon-' + commentId);
      $commentIcon.toggleClass('withReply', commentHasReply);
    }
  });
}

// Indicates if event was on one of the elements that does not close comment (any of the comment icons)
var shouldNotCloseComment = function(e) {
  return $(e.target).closest('.comment-icon').length !== 0;
}

exports.insertContainer = insertContainer;
exports.addIcons = addIcons;
exports.hideIcons = hideIcons;
exports.adjustTopOf = adjustTopOf;
