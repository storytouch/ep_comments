var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');

var utils = require('./utils');
var shared = require('./shared');

var commentDataManager = function(socket) {
  this.thisPlugin = pad.plugins.ep_comments_page;
  this.socket = socket;
  this.comments = {};
  this.commentsStillOnText = [];

  this.thisPlugin.api.setHandleCommentEdition(this._onCommentEdition.bind(this));
  this.thisPlugin.api.setHandleReplyEdition(this._onReplyEdition.bind(this));
  this.thisPlugin.api.setToggleImportantFlag(this._onToggleImportantFlag.bind(this));

  // listen to comment or reply changes made by other users on this pad
  var self = this;
  this.socket.on('textCommentUpdated', function(commentId, commentText) {
    self._setCommentOrReplyNewText(commentId, commentText);
  });

  // on collaborator toggle comment important flag
  this.socket.on('importantCommentUpdated', function(commentId) {
    self._setCommentImportantFlag(commentId);
  });
}

commentDataManager.prototype.getComments = function() {
  return this.comments;
}

commentDataManager.prototype.getTextMarkOccurrencesOnText = function() {
  var textMarksObserver = pad.plugins.ep_comments_page.textMarksObserver;
  return textMarksObserver.getAttributeOccurrences(shared.COMMENT_PREFIX_KEY);
}

commentDataManager.prototype.getCommentIdsStillOnText = function() {
  return this.commentsStillOnText.map(function(comment) {
    return comment.commentId;
  });
}

// we only return the comment data if this comment is still present on text
commentDataManager.prototype.getDataOfCommentIfStillPresentOnText = function(commentId) {
  var comment = this.commentsStillOnText.find(function(comment){
    return comment.commentId === commentId;
  });

  return Object.keys(comment).length ? comment : {};
}

commentDataManager.prototype.getRepliesOfComment = function(commentId) {
  var replies = this.comments[commentId] ? this.comments[commentId].replies : {};
  return replies;
}

commentDataManager.prototype.addComments = function(comments) {
  for(var commentId in comments) {
    this.addComment(commentId, comments[commentId]);
  }
}

commentDataManager.prototype.addComment = function(commentId, commentData) {
  commentData.commentId     = commentId;
  commentData.date          = commentData.timestamp;
  commentData.formattedDate = new Date(commentData.timestamp).toISOString();
  commentData.replies       = {};
  commentData.important     = commentData.important || false;

  this.comments[commentId] = commentData;
}

commentDataManager.prototype.addReplies = function(replies) {
  for(var replyId in replies) {
    this.addReplyWithoutTriggeringDataChangedEvent(replyId, replies[replyId]);
  }
}

commentDataManager.prototype.addReplyWithoutTriggeringDataChangedEvent = function(replyId, replyData) {
  this.addReply(replyId, replyData, true);
}

commentDataManager.prototype.addReply = function(replyId, replyData, doNotTriggerDataChanged) {
  replyData.replyId       = replyId;
  replyData.date          = replyData.timestamp;
  replyData.formattedDate = new Date(replyData.timestamp).toISOString();

  var commentOfReply = this.comments[replyData.commentId];

  // precaution, if for any reason the comment was removed but the reply wasn't
  if (commentOfReply && commentOfReply.replies) {
    commentOfReply.replies[replyId] = replyData;
  }

  if (!doNotTriggerDataChanged) {
    this.triggerDataChanged();
  }
}

commentDataManager.prototype._onCommentEdition = function(commentId, commentText, cb) {
  var self = this;
  var data = {
    padId: clientVars.padId,
    commentId: commentId,
    commentText: commentText,
    currentUser: clientVars.userId,
  }

  this.socket.emit('updateCommentText', data, function(err) {
    if (!err) {
      // although the comment was saved on the data base successfully, we need
      // to update our local data with the new text saved
      var comment = self.comments[commentId];
      comment.text = commentText;

      self.triggerDataChanged();
      if (cb) cb();
    }
  });
}

commentDataManager.prototype._onReplyEdition = function(commentId, replyId, replyText) {
  var self = this;
  var data = {
    padId: clientVars.padId,
    commentId: replyId,
    commentText: replyText,
    currentUser: clientVars.userId,
  }

  this.socket.emit('updateCommentText', data, function(err) {
    if (!err) {
      // although the reply was saved on the data base successfully, we need
      // to update our local data with the new text saved
      var reply = self.comments[commentId].replies[replyId];
      reply.text = replyText;

      self.triggerDataChanged();
    }
  });
}

commentDataManager.prototype._setCommentOrReplyNewText = function(commentOrReplyId, text) {
  var comment = this.comments[commentOrReplyId];
  if (comment) {
    comment.text = text;
  } else {
    // TODO receive commentId, so we don't need to look for the reply on each comment
    var flattenReplies = utils.getRepliesIndexedByReplyId(this.comments);
    var commentId = flattenReplies[commentOrReplyId].commentId;

    var reply = this.comments[commentId].replies[commentOrReplyId];
    reply.text = text;
  }

  this.triggerDataChanged();
}

commentDataManager.prototype._onToggleImportantFlag = function(commentId) {
  var self       = this;
  var data       = {};
  data.padId     = clientVars.padId;
  data.commentId = commentId;

  var setCommentImportantFlagBound = this._setCommentImportantFlag.bind(this);

  this.socket.emit('toggleImportantFlag', data, function(err) {
    if (!err) {
      setCommentImportantFlagBound(commentId);
    }
  });
}

commentDataManager.prototype._setCommentImportantFlag = function(commentId) {
  var comment = this.comments[commentId];
  comment.important = !comment.important;

  this.triggerDataChanged();
};

commentDataManager.prototype.refreshAllCommentData = function(callback) {
  var req = { padId: clientVars.padId };

  var self = this;
  this.socket.emit('getComments', req, function(res) {
    self.comments = {};
    self.addComments(res.comments);

    callback(res.comments);
  });
}

commentDataManager.prototype.refreshAllReplyData = function(callback) {
  this._resetRepliesOnComments();

  var req = { padId: clientVars.padId };
  var self = this;
  this.socket.emit('getCommentReplies', req, function(res) {
    self.addReplies(res.replies);

    if (callback) callback(res.replies);
  });
}

commentDataManager.prototype._resetRepliesOnComments = function() {
  _(this.comments).each(function(comment, commentId) {
    comment.replies = {};
  });
}

commentDataManager.prototype.triggerDataChanged = function(textMarkOccurrences) {
  // TODO this method is doing too much. On this case we only need to send the list
  // of comments on the api, don't need to collect all comments from text
  var commentsOnText = textMarkOccurrences ? textMarkOccurrences : this.getTextMarkOccurrencesOnText();
  this._updateListOfCommentsStillOnText(commentsOnText);
}

// some comments might had been removed from text, so update the list
commentDataManager.prototype._updateListOfCommentsStillOnText = function(textMarkOccurrences) {
  // TODO can we store the data that we're processing here, so we don't need to redo
  // the processing for the data we had already built?
  // I guess we should run this method only on the lines changed

  var commentsToSend = _(textMarkOccurrences)
    .chain()
    .filter(function(textMarkOccurrence) {
      // does not process deleted comments and comments
      // whose user line was not calculated yet
      var isCommentDeleted = textMarkOccurrence.value === 'comment-deleted';
      var isCommentUserLineExisting = !!textMarkOccurrence.position.userLineOfOccurrence;
      return !isCommentDeleted && isCommentUserLineExisting;
    })
    .map(function(textMarkOccurrence) {
      var textMarkOccurenceId = textMarkOccurrence.key;
      var commentId = textMarkOccurenceId .replace(shared.COMMENT_PREFIX_KEY, shared.COMMENT_PREFIX);
      var targetComment = this.comments[commentId];

      if (targetComment !== undefined) {
        // create a copy of each comment, so we can change it without messing up
        // with self.comments
        var commentData = Object.assign({}, targetComment);

        // get scene number
        var userLineOfOccurrence = textMarkOccurrence.position.userLineOfOccurrence;
        if (userLineOfOccurrence) {
          commentData.scene = this._getSceneNumber(userLineOfOccurrence);
        }

        var nodeWithComment = this._getNodeWithComment(commentId);
        if (nodeWithComment) {
          commentData.replies = this._getRepliesStillOnTextSortedByDate(commentData, nodeWithComment);
        }

        return commentData;
      }
      return;
    }, this)
    .compact()
    .value();

  // keep these comments data, so it can be used on the Etherpad side (e.g. show comments
  // data on the comment info dialog)
  this.commentsStillOnText = commentsToSend;

  this.thisPlugin.api.triggerDataChanged(commentsToSend);
}

commentDataManager.prototype._getNodeWithComment = function(commentId) {
  return utils.getPadInner().find('.comment.' + commentId)[0];
}

commentDataManager.prototype._getSceneNumber = function(userLineOfComment) {
  return userLineOfComment.eascLevel.scene;
}

commentDataManager.prototype._getRepliesStillOnTextSortedByDate = function(commentData, nodeWithComment) {
  // remove replies that are not on text anymore
  var commentReplyIds = _(nodeWithComment.classList).filter(function(className) {
    var isAReplyId = shared.getReplyIdsFrom(className).length;

    // there might be another comment (with reply) on the same DOM nodeWithComment of this comment
    var isAReplyIdOfThisComment = isAReplyId && commentData.replies && commentData.replies[className];
    return isAReplyIdOfThisComment;
  });

  // sort replies by date. Note: this needs to be done because DELETE/UNDO messes
  // up with the order of the replies on text class
  var sortedReplyIds = _(commentReplyIds).sortBy(function(replyId) {
    return commentData.replies[replyId].timestamp;
  });

  return _(commentData.replies).pick(sortedReplyIds);
}

exports.init = function(socket) {
  return new commentDataManager(socket);
}
