var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');

var linesChangedListener = require('./linesChangedListener');
var utils = require('./utils');
var shared = require('./shared');

var commentDataManager = function(socket) {
  this.thisPlugin = pad.plugins.ep_comments_page;
  this.socket = socket;
  this.comments = {};

  linesChangedListener.onLineChanged('.comment, heading', this.triggerDataChanged.bind(this));

  this.thisPlugin.api.setHandleCommentEdition(this._onCommentEdition.bind(this));
  this.thisPlugin.api.setHandleReplyEdition(this._onReplyEdition.bind(this));

  // listen to comment or reply changes made by other users on this pad
  var self = this;
  this.socket.on('textCommentUpdated', function (commentId, commentText) {
    self._setCommentOrReplyNewText(commentId, commentText);
  });
}

commentDataManager.prototype.getComments = function() {
  return this.comments;
}

commentDataManager.prototype.getComment = function(commentId) {
  return this.comments[commentId];
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

commentDataManager.prototype.triggerDataChanged = function() {
  // TODO this method is doing too much. On this case we only need to send the list
  // of comments on the api, don't need to collect all comments from text
  this.updateListOfCommentsStillOnText();
}

// some comments might had been removed from text, so update the list
commentDataManager.prototype.updateListOfCommentsStillOnText = function() {
  // TODO can we store the data that we're processing here, so we don't need to redo
  // the processing for the data we had already built?
  // I guess we should run this method only on the lines changed

  var $scenes = utils.getPadInner().find('div.withHeading');

  var commentsToSend = _(this._getListOfCommentsOrdered())
    .chain()
    .map(function(commentInfo) {
      var commentId = commentInfo.commentId;
      var targetComment = this.comments[commentId];
      if (targetComment !== undefined) {
        // create a copy of each comment, so we can change it without messing up
        // with self.comments
        var commentData = Object.assign({}, targetComment);

        var nodeWithComment = commentInfo.nodeWithComment;
        commentData.scene = this._getSceneNumber($scenes, nodeWithComment);
        commentData.replies = this._getRepliesStillOnTextSortedByDate(commentData, nodeWithComment);

        return commentData;
      }
      return; 
    }, this)
    .compact()
    .value();

  this.thisPlugin.api.triggerDataChanged(commentsToSend);
}

commentDataManager.prototype._getListOfCommentsOrdered = function() {
  var $commentsOnText = utils.getPadInner().find('.comment');

  // get the order of comments to send on API + grab data from script to be used
  // to fill comment & reply data later
  var orderedComments = $commentsOnText.map(function() {
    var nodeWithComment = this;
    var nodeWithCommentClass = $(nodeWithComment).attr('class');
    var commentIds = shared.getCommentIdsFrom(nodeWithCommentClass);

    var commentIdsData = _(commentIds).map(function(commentId){
      return {
        commentId: commentId,
        nodeWithComment: nodeWithComment,
      }
    });

    return commentIdsData;
  });

  // remove null and duplicate ids (this happens when comment is split
  // into 2 parts -- by an overlapping comment, for example)
  orderedComments = _(orderedComments)
    .chain()
    .flatten()
    .compact()
    .unique('commentId')
    .value();

  return orderedComments;
}

commentDataManager.prototype._getSceneNumber = function ($scenes, nodeWithComment) {
  // fill scene number
  var $lineWithComment = $(nodeWithComment).closest('div');
  var $headingOfSceneWhereCommentIs = utils.getHeadingOfDomLine($lineWithComment);
  var sceneNumberOfComment = 1 + $scenes.index($headingOfSceneWhereCommentIs);
  return sceneNumberOfComment;
}

commentDataManager.prototype._getRepliesStillOnTextSortedByDate = function (commentData, nodeWithComment) {
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
