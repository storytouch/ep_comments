var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');
var padcookie = require('ep_etherpad-lite/static/js/pad_cookie').padcookie;
var browser = require('ep_etherpad-lite/static/js/browser');

var shared = require('./shared');
var shortcuts = require('./shortcuts');
var commentIcons = require('./commentIcons');
var newComment = require('./newComment');
var preTextMarker = require('./preTextMarker');
var commentDataManager = require('./commentDataManager');
var commentL10n = require('./commentL10n');
var copyPasteEvents = require('./copyPasteEvents');
var api = require('./api');
var utils = require('./utils');
var commentSaveOrDelete = require('./commentSaveOrDelete');
var textMarkIconsPosition = require('./textMarkIconsPosition');
var scheduler = require('./scheduler');

var cssFiles = [
  '//fonts.googleapis.com/css?family=Roboto:300,400', // light, regular
  'ep_comments_page/static/css/lib/jquery-ui.min.css',
  'ep_comments_page/static/css/lib/jquery-ui.structure.min.css',
  'ep_comments_page/static/css/lib/jquery-ui.theme.min.css',
  'ep_comments_page/static/css/dialog.css',
  'ep_comments_page/static/css/dialog-light.css',
  'ep_comments_page/static/css/dialog-dark.css',
  'ep_comments_page/static/css/comment.css',
  'ep_comments_page/static/css/commentIcon.css',
  'ep_comments_page/static/css/commentModal.css',
  'ep_comments_page/static/css/jquery-ui-custom.css',
  'ep_comments_page/static/css/jquery-ui-custom-light.css',
  'ep_comments_page/static/css/jquery-ui-custom-dark.css',
];

var UPDATE_COMMENT_LINE_POSITION_EVENT = 'updateCommentLinePosition';
var COMMENT_CLASS = '.comment';
var COMMENT_CLASS_PREFIX = 'c-';
var TIME_TO_UPDATE_ICON_POSITION = 1000;
/************************************************************************/
/*                         ep_comments Plugin                           */
/************************************************************************/

// Container
function ep_comments(context){
  this.ace = context.ace;
  this.socket = utils.openSocketConnectionToRoute('/comment');
  this.shouldCollectComment = false;

  api.init();
  copyPasteEvents.init();
  this.commentDataManager = commentDataManager.init(this.socket);
  this.textMarkIconsPosition = textMarkIconsPosition.init({
    hideIcons: commentIcons.hideIcons,
    textMarkClass: COMMENT_CLASS,
    textkMarkPrefix: COMMENT_CLASS_PREFIX,
    adjustTopOf: commentIcons.adjustTopOf,
  });

  // to avoid lagging while user is typing, we set a scheduler to postpone
  // calling callback until edition had stopped
  this.updateIconsPositionSchedule = scheduler.setCallbackWhenUserStopsChangingPad(
    this.textMarkIconsPosition.updateIconsPosition.bind(this.textMarkIconsPosition), TIME_TO_UPDATE_ICON_POSITION);
  this.init();
}

// Init Etherpad plugin comment pads
ep_comments.prototype.init = function(){
  var self = this;

  newComment.createNewCommentForm(this.ace);
  commentIcons.insertContainer(this.ace);

  // Get initial set of comments and replies
  this.commentDataManager.refreshAllCommentData(function(comments) {
    self.commentDataManager.refreshAllReplyData(function(replies) {
      if (!$.isEmptyObject(comments)) {
        self.collectComments();
      }

      self.commentRepliesListen();
      self.commentListen();
    });
  });

  // On collaborator add a comment or reply in the current pad
  this.socket.on('pushAddComment', function (commentId, comment) {
    self.commentDataManager.addComment(commentId, comment);
    self.collectCommentsAfterSomeIntervalsOfTime();
  });
  this.socket.on('pushAddCommentReply', function (replyId, reply) {
    self.commentDataManager.addReply(replyId, reply);
  });

  // When screen size changes (user changes device orientation, for example),
  // we need to make sure all sidebar comments are on the correct place
  utils.waitForResizeToFinishThenCall(200, function() {
    self.editorResized();
  });

  // Allow recalculating the comments position by event
  utils.getPadInner().on(UPDATE_COMMENT_LINE_POSITION_EVENT, function(e) {
    self.editorResized();
  });

  // listen to events called by other plugins
  utils.getPadOuter().find('body').on(utils.OPEN_NEW_COMMENT_MODAL_EVENT, function() {
    self.displayNewCommentForm();
  });

  utils.getPadInner().find('#innerdocbody').addClass('comments');

  api.setHandleReplyCreation(function(commentId, text) {
    var data = self.getCommentData();
    data.commentId = commentId;
    data.reply = text;

    self.socket.emit('addCommentReply', data, function(replyId, reply) {
      commentSaveOrDelete.saveReplyOnCommentText(replyId, commentId, self.ace);
      self.commentDataManager.addReply(replyId, reply);
    });
  });

  api.setHandleCommentDeletion(function(commentId) {
    var repliesOfComment = self.commentDataManager.getRepliesOfComment(commentId);
    var replyIds = _(repliesOfComment).pluck('replyId');

    commentSaveOrDelete.deleteCommentAndItsReplies(commentId, replyIds, self.ace);

    self.collectComments();
  });
  api.setHandleReplyDeletion(function(replyId, commentId) {
    commentSaveOrDelete.deleteReply(replyId, commentId, self.ace);
  });
  this.socket.on('pushDeleteCommentReply', function(replyId, commentId) {
    commentSaveOrDelete.deleteReply(replyId, commentId, self.ace);
  });

  // Enable and handle cookies
  if (padcookie.getPref("comments") === false) {
    $('#options-comments').attr('checked','unchecked');
    $('#options-comments').attr('checked',false);
  }else{
    $('#options-comments').attr('checked','checked');
  }

  $('#options-comments').on('click', function() {
    if($('#options-comments').is(':checked')) {
      padcookie.setPref("comments", true);
    } else {
      padcookie.setPref("comments", false);
    }
  });

  copyPasteEvents.listenToCopyCutPasteEventsOfItems({
    itemType: 'comment',
    subItemType: 'reply',
    itemSelectorOnPad: COMMENT_CLASS,
    subItemSelectorOnPad: '.comment-reply',
    getItemsData: function() { return self.commentDataManager.getComments() },
    getSubItemsData: utils.getRepliesIndexedByReplyId,
    getItemIdsFromString: shared.getCommentIdsFrom,
    getSubItemIdsFromString: shared.getReplyIdsFrom,
    generateNewItemId: shared.generateCommentId,
    generateNewSubItemId: shared.generateReplyId,
    setItemIdOnItem: function(comment, newCommentId) { comment.commentId = newCommentId },
    setSubItemIdOnSubItem: function(reply, newReplyId) { reply.replyId = newReplyId },
    setItemIdOnSubItem: function(reply, newCommentId) { reply.commentId = newCommentId },
    getItemIdOfSubItem: function(reply) { return reply.commentId },
    getSubItemsOf: function(comment) { return comment.replies },
    saveItemsData: this.saveCommentWithoutSelection.bind(this),
    saveSubItemsData: this.saveRepliesWithoutSelection.bind(this),
  });
};

ep_comments.prototype.handleReplyDeletion = function(replyId, commentId) {
  commentSaveOrDelete.deleteReply(replyId, commentId, this.ace);
}

// This function is useful to collect new comments on the collaborators
ep_comments.prototype.collectCommentsAfterSomeIntervalsOfTime = function() {
  var self = this;
  window.setTimeout(function() {
    self.collectComments();

    var count_comments=0;
    for(var key in self.comments)  {count_comments++;}
    var padComment  = utils.getPadInner().find(COMMENT_CLASS);
    if( count_comments > padComment.length ) {
       window.setTimeout(function() {
          self.collectComments();
          var count_comments=0;
          for(var key in self.comments)  {count_comments++;}
          var padComment  = utils.getPadInner().find(COMMENT_CLASS);
          if( count_comments > padComment.length ) {
             window.setTimeout(function() {
                self.collectComments();
                var count_comments=0;
                for(var key in self.comments)  {count_comments++;}
                var padComment  = utils.getPadInner().find(COMMENT_CLASS);
                if( count_comments > padComment.length ) {
                   window.setTimeout(function() {
                      self.collectComments();

                    }, 9000);
                }
              }, 3000);
          }
        }, 1000);
    }
  }, 300);
}

// Collect Comments that are still on text
ep_comments.prototype.collectComments = function(callback) {
  this.commentDataManager.updateListOfCommentsStillOnText();
  commentIcons.addIcons(this.commentDataManager.getComments());
  this.textMarkIconsPosition.updateIconsPosition();

  if(callback) callback();
};

// Make the adjustments after editor is resized (due to a window resize or
// enabling/disabling Page View)
ep_comments.prototype.editorResized = function() {
  this.textMarkIconsPosition.updateIconsPosition();
}

ep_comments.prototype.getCommentData = function (){
  var data = {};

  // Insert comment data
  data.padId              = clientVars.padId;
  data.comment            = {};
  data.comment.author     = clientVars.userId;
  data.comment.name       = pad.myUserInfo.name;
  data.comment.timestamp  = new Date().getTime();

  // If client is anonymous
  if(data.comment.name === undefined){
    data.comment.name = clientVars.userAgent;
  }

  return data;
}

ep_comments.prototype.displayNewCommentForm = function(aceContext) {
  // do nothing if we have nothing selected
  if (this.hasSelectedText(aceContext)) {
    this.showNewCommentForm(aceContext);
  }
}

ep_comments.prototype.hasSelectedText = function(aceContext) {
  var rep = aceContext && aceContext.rep;
  if (!rep) {
    this.ace.callWithAce(function(ace) {
      rep = ace.ace_getRep();
    },'saveCommentedSelection', true);
  }

  return rep.selStart[0] !== rep.selEnd[0] || rep.selStart[1] !== rep.selEnd[1];
}

// Create form to add comment
ep_comments.prototype.showNewCommentForm = function(aceContext) {
  var data = this.getCommentData();
  var self = this;

  newComment.showNewCommentForm(data, aceContext, function(commentText, preMarkedTextRepArr) {
    data.comment.text = commentText;
    self.saveComment(data, preMarkedTextRepArr);
  });
};

// Save comment
ep_comments.prototype.saveComment = function(data, preMarkedTextRepArr) {
  var self = this;
  self.socket.emit('addComment', data, function (commentId, comment){
    commentSaveOrDelete.saveCommentOnPreMarkedText(commentId, preMarkedTextRepArr, self.ace);
    self.commentDataManager.addComment(commentId, comment);
    self.collectComments();
  });
}

// commentData = {c-newCommentId123: data:{author:..., date:..., ...}, c-newCommentId124: data:{...}}
ep_comments.prototype.saveCommentWithoutSelection = function (commentData) {
  var self = this;
  var padId = clientVars.padId;
  var data = self.buildComments(commentData);

  self.socket.emit('bulkAddComment', padId, data, function (comments){
    self.commentDataManager.addComments(comments);
    self.shouldCollectComment = true;
  });
}

ep_comments.prototype.buildComments = function(commentsData){
  return _.map(commentsData, this.buildComment);
}

// commentData = {c-newCommentId123: data:{author:..., date:..., ...}, ...
ep_comments.prototype.buildComment = function(commentData, commentId){
  var data = {};
  data.padId = clientVars.padId;
  data.commentId = commentId;
  data.text = commentData.text;
  data.name = commentData.name;
  data.timestamp = parseInt(commentData.timestamp);

  return data;
}

// commentReplyData = {cr-123:{commentReplyData1}, cr-234:{commentReplyData1}, ...}
ep_comments.prototype.saveRepliesWithoutSelection = function(commentReplyData) {
  var self = this;
  var padId = clientVars.padId;
  var data = self.buildCommentReplies(commentReplyData);

  self.socket.emit('bulkAddCommentReplies', padId, data, function(replies) {
    self.commentDataManager.addReplies(replies);
    self.shouldCollectComment = true; // force collect the comment replies saved
  });
}

ep_comments.prototype.buildCommentReplies = function(repliesData){
  var self = this;
  var replies = _.map(repliesData, function(replyData){
    return self.buildCommentReply(replyData);
  });
  return replies;
}

// take a replyData and add more fields necessary. E.g. 'padId'
ep_comments.prototype.buildCommentReply = function(replyData){
  var data = {};
  data.padId = clientVars.padId;
  data.commentId = replyData.commentId;
  data.text = replyData.text;
  data.replyId = replyData.replyId;
  data.name = replyData.name;
  data.timestamp = parseInt(replyData.timestamp);

  return data;
}

// Listen for comment
ep_comments.prototype.commentListen = function(){
  var self = this;
  this.socket.on('pushAddCommentInBulk', function() {
    self.commentDataManager.refreshAllCommentData(function(allComments) {
      if (!$.isEmptyObject(allComments)) {
        self.collectCommentsAfterSomeIntervalsOfTime(); // here we collect on the collaborators
      }
    });
  });
};

// Listen for comment replies
ep_comments.prototype.commentRepliesListen = function(){
  var self = this;
  this.socket.on('pushAddCommentReplyInBulk', function(replyId, reply) {
    self.commentDataManager.refreshAllReplyData();
  });
};

/************************************************************************/
/*                           Etherpad Hooks                             */
/************************************************************************/

var hooks = {

  // Init pad comments
  postAceInit: function(hook, context){
    var Comments = new ep_comments(context);
    pad.plugins = pad.plugins || {};
    pad.plugins.ep_comments_page = pad.plugins.ep_comments_page || {};
    pad.plugins.ep_comments_page.commentHandler = Comments;
  },

  aceEditEvent: function(hook, context){
    var eventType = context.callstack.editEvent.eventType;
    if(eventType == "setup" || eventType == "setBaseText" || eventType == "importText") return;

    // first check if some text is being marked/unmarked to add comment to it
    preTextMarker.processAceEditEvent(context);

    if(context.callstack.docTextChanged) {
      pad.plugins.ep_comments_page.commentHandler.updateIconsPositionSchedule.padChanged();
    }

    var commentWasPasted = ((((pad || {}).plugins || {}).ep_comments_page || {}).commentHandler || {}).shouldCollectComment;
    var domClean = context.callstack.domClean;
    // we have to wait the DOM update from a fakeComment 'fakecomment-123' to a comment class 'c-123'
    if(commentWasPasted && domClean){
      pad.plugins.ep_comments_page.commentHandler.collectComments(function(){
        pad.plugins.ep_comments_page.commentHandler.shouldCollectComment = false;
      });
    }
  },

  // Insert comments classes
  aceAttribsToClasses: function(hook, context){
    if(context.key === 'comment' && context.value !== "comment-deleted") {
      return ['comment', context.value];
    }
    else if(context.key.startsWith('comment-reply-')) {
      return ['comment-reply', context.value];
    }
    return preTextMarker.processAceAttribsToClasses(context);
  },

  aceEditorCSS: function(){
    return cssFiles;
  },

  aceKeyEvent: function(hook, context) {
    return shortcuts.processAceKeyEvent(context);
  }

};

exports.aceEditorCSS          = hooks.aceEditorCSS;
exports.postAceInit           = hooks.postAceInit;
exports.aceAttribsToClasses   = hooks.aceAttribsToClasses;
exports.aceEditEvent          = hooks.aceEditEvent;
exports.aceKeyEvent           = hooks.aceKeyEvent;

// Given a CSS selector and a target element (in this case pad inner)
// return the rep as an array of array of tuples IE [[[0,1],[0,2]], [[1,3],[1,5]]]
// We have to return an array of a array of tuples because there can be multiple reps
// For a given selector
// A more sane data structure might be an object such as..
/*
0:{
  xStart: 0,
  xEnd: 1,
  yStart: 0,
  yEnd: 1
},
1:...
*/
// Alas we follow the Etherpad convention of using tuples here.
function getRepFromSelector(selector) {
  var editorInfo = this.editorInfo;

  // first find the element
  var $elements = utils.getPadInner().find(selector);

  var repArr = [];
  // cannot use $.map here, jQuery flattens the result and
  // getRepFromDOMElement returns an array of arrays
  $.each($elements, function(index, span){
    repArr.push(editorInfo.ace_getRepFromDOMElement(span));
  });
  return repArr;
}

function getRepFromDOMElement(span) {
  var attributeManager = this.documentAttributeManager;

  // create a rep array container we can push to..
  var rep = [[],[]];

  // span not be the div so we have to go to parents until we find a div
  var parentDiv = $(span).closest("div");
  // line Number is obviously relative to entire document
  // So find out how many elements before in this parent?
  var lineNumber = $(parentDiv).prevAll("div").length;
  // We can set beginning of rep Y (lineNumber)
  rep[0][0] = lineNumber;

  // We can also update the end rep Y
  rep[1][0] = lineNumber;

  // Given the comment span, how many characters are before it?

  // All we need to know is the number of characters before .foo
  /*

  <div id="boo">
    hello
    <span class='nope'>
      world
    </span>
    are you
    <span class='foo'>
      here?
    </span>
  </div>

  */
  // In the example before the correct number would be 21
  // I guess we could do prevAll each length?
  // If there are no spans before we get 0, simples!
  // Note that this only works if spans are being used, which imho
  // Is the correct container however if block elements are registered
  // It's plausable that attributes are not maintained :(
  var leftOffset = 0;

  // If the line has a lineAttribute then leftOffset should be +1
  // Get each line Attribute on this line..
  var hasLineAttribute = false;
  var attrArr = attributeManager.getAttributesOnLine(lineNumber);
  $.each(attrArr, function(attrK, value){
    if(value[0] === "lmkr") hasLineAttribute = true;
  });
  if(hasLineAttribute) leftOffset++;

  $(span).prevAll("span").each(function(){
    var spanOffset = $(this).text().length;
    leftOffset += spanOffset;
  });
  rep[0][1] = leftOffset;

  // All we need to know is span text length and it's left offset in chars
  var spanLength = $(span).text().length;

  rep[1][1] = rep[0][1] + $(span).text().length; // Easy!

  return rep;
}

exports.aceInitialized = function(hook, context){
  var editorInfo = context.editorInfo;
  editorInfo.ace_getRepFromSelector = _(getRepFromSelector).bind(context);
  editorInfo.ace_getRepFromDOMElement = _(getRepFromDOMElement).bind(context);
  editorInfo.ace_showSMHiddenIfTextMarkIsOnIt = _(commentIcons.showSMHiddenIfTextMarkIsOnIt).bind(context);
}

exports.aceRegisterNonScrollableEditEvents = function(){
  return [preTextMarker.MARK_TEXT_EVENT, preTextMarker.UNMARK_TEXT_EVENT];
}

exports.collectContentPre = function(hook, context){
  shared.collectContentPre(hook, context);
  preTextMarker.processCollectContentPre(context);
}
