var _ = require('ep_etherpad-lite/static/js/underscore');
var linesChangedListener = require('./linesChangedListener');

var commentsSetChangeHandler = function() {
  var thisPlugin = pad.plugins.ep_comments_page;
  this.api = thisPlugin.api;
  this.commentDataManager = thisPlugin.commentDataManager;

  this.lastCommentIdsSent = [];
  this.thisAuthorChangedPadSinceLasteApiCall = false;

  linesChangedListener.onLineChanged('.comment', this._handlePossibleCommentsAddedOrRemovedFromText.bind(this));
};

commentsSetChangeHandler.prototype.initializeCommentsSet = function(comments) {
  this.lastCommentIdsSent = Object.keys(comments);
}

commentsSetChangeHandler.prototype.thisAuthorChangedPad = function() {
  this.thisAuthorChangedPadSinceLasteApiCall = true;
}

// make sure API is notified whenever comments are available on text
commentsSetChangeHandler.prototype.commentsWillBeAddedToText = function(comments) {
  var commentsToBeAdded = Object.keys(comments);
  var commentsOnText = this.commentDataManager.getCommentIdsStillOnText();
  var commentsAlreadyAdded = _.intersection(commentsToBeAdded, commentsOnText).length > 0;

  if (commentsAlreadyAdded) {
    this.commentAddedOrRemoved();
  } else {
    // comments are still being collected, so make sure the API will be notified when this is finished
    this.thisAuthorChangedPadSinceLasteApiCall = true;
  }
}

commentsSetChangeHandler.prototype.commentAddedOrRemoved = function() {
  // update current comment ids
  this.lastCommentIdsSent = this.commentDataManager.getCommentIdsStillOnText();

  // reset flag, so changes in the future won't be considered as mine
  this.thisAuthorChangedPadSinceLasteApiCall = false;

  this.api.triggerCommentsSetChanged(this.lastCommentIdsSent);
}

// a line with a comment was edited, but we need to check if a comment was added
// or removed from text.
// Ignore changes made by other users -- we are only interested on changes of
// current user
commentsSetChangeHandler.prototype._handlePossibleCommentsAddedOrRemovedFromText = function() {
  var currentCommentIds = this.commentDataManager.getCommentIdsStillOnText();

  if (this.thisAuthorChangedPadSinceLasteApiCall && !this._sameComments(currentCommentIds, this.lastCommentIdsSent)) {
    this.commentAddedOrRemoved();
  }

  this.lastCommentIdsSent = currentCommentIds;
}

commentsSetChangeHandler.prototype._sameComments = function(array1, array2) {
  var sameSize = array1.length === array2.length;
  return sameSize && _.difference(array1, array2).length === 0;
}

exports.init = function() {
  return new commentsSetChangeHandler();
}

