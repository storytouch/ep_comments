var _ = require('ep_etherpad-lite/static/js/underscore');

// messages sent to outside
var COMMENT_ACTIVATED_MESSAGE_TYPE = 'comment_activated';
var NEW_DATA_MESSAGE_TYPE = 'comments_data_changed';

// messages coming from outside
var DELETE_COMMENT_MESSAGE_TYPE = 'comment_delete';
var ACTIVATE_COMMENT_MESSAGE_TYPE = 'comment_activate';
var EDIT_COMMENT_MESSAGE_TYPE = 'comment_edit';
var EDIT_REPLY_MESSAGE_TYPE = 'comment_reply_edit';
var DELETE_REPLY_MESSAGE_TYPE = 'comment_reply_delete';
var SHOW_COMMENT_INFO_TYPE = 'show_comment_info';

var commentApi = function() {
  this.onCommentDeletion = function() {};
  this.onCommentEdition = function() {};
  this.onCommentActivation = function() {};
  this.onReplyEdition = function() {};
  this.onReplyCreate = function() {};
  this.onReplyDeletion = function() {};
  this.onShowCommentInfo = function() {};

  var self = this;

  // listen to outbound calls of this API
  window.addEventListener('message', function(e) {
    self._handleOutboundCalls(e);
  });
};

commentApi.prototype._handleOutboundCalls = function(e) {
  switch (e.data.type) {
    case DELETE_COMMENT_MESSAGE_TYPE:
      this.onCommentDeletion(e.data.commentId);
      break;

    case ACTIVATE_COMMENT_MESSAGE_TYPE:
      this.onCommentActivation(e.data.commentId);
      break;

    case EDIT_COMMENT_MESSAGE_TYPE:
      this.onCommentEdition(e.data.commentId, e.data.text);
      break;

    case EDIT_REPLY_MESSAGE_TYPE:
      if (e.data.replyId === undefined) {
        this.onReplyCreate(e.data.commentId, e.data.text);
      } else {
        this.onReplyEdition(e.data.commentId, e.data.replyId, e.data.text);
      }
      break;

    case DELETE_REPLY_MESSAGE_TYPE:
      var commentId = e.data.commentId;
      var replyId = e.data.replyId;
      this.onReplyDeletion(replyId, commentId);
      break;

    case SHOW_COMMENT_INFO_TYPE:
      var commentId = e.data.commentId;
      this.onShowCommentInfo(commentId);
      break;
  }
};

commentApi.prototype.setHandleCommentDeletion = function(fn) {
  this.onCommentDeletion = fn;
};

commentApi.prototype.setHandleCommentActivation = function(fn) {
  this.onCommentActivation = fn;
};

commentApi.prototype.setHandleCommentEdition = function(fn) {
  this.onCommentEdition = fn;
};

commentApi.prototype.setHandleReplyEdition = function(fn) {
  this.onReplyEdition = fn;
};

commentApi.prototype.setHandleReplyCreation = function(fn) {
  this.onReplyCreate = fn;
};

commentApi.prototype.setHandleReplyDeletion = function(fn) {
  this.onReplyDeletion = fn;
};

commentApi.prototype.setHandleShowCommentInfo = function(fn) {
  this.onShowCommentInfo = fn;
};

/*
  message: {
    type: 'comment_activated',
    commentId: 'c-b4WEFBNt7Bxu6Dhr'
  }
*/
commentApi.prototype.triggerCommentActivation = function(commentId) {
  var message = {
    type: COMMENT_ACTIVATED_MESSAGE_TYPE,
    commentId: commentId,
  };
  this._triggerEvent(message);
};

commentApi.prototype.triggerCommentDeactivation = function() {
  this.triggerCommentActivation(undefined);
};

/*
  message: {
    type: 'comments_data_changed',
    values: [
      {
        commentId: 'c-b4WEFBNt7Bxu6Dhr',
        author: 'a.dG8CtEvWhEmR3cf5',
        name: 'Author Name',
        text: 'the comment text',
        timestamp: 1501599806477,
        replies: [
          {
            replyId: 'cr-dfksfu2df',
            author: 'a.aT8CtEvWhEmR3cf5',
            name: 'Other Author Name',
            text: 'the reply text',
            timestamp: 1621599806477,
          },
          (...)
        ]
      },
      (...)
    ]
  }
*/
commentApi.prototype.triggerDataChanged = function(commentsData) {
  var message = {
    type: NEW_DATA_MESSAGE_TYPE,
    values: commentsData,
  };

  this._triggerEvent(message);
};

commentApi.prototype._triggerEvent = function(message) {
  // if there's a wrapper to Etherpad, send data to it; otherwise use Etherpad own window
  var target = window.parent ? window.parent : window;
  target.postMessage(message, '*');
};

exports.init = function() {
  return new commentApi();
};
