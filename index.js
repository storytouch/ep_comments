var eejs = require('ep_etherpad-lite/node/eejs/');
var commentManager = require('./commentManager');
var _ = require('ep_etherpad-lite/static/js/underscore');

exports.padRemove = function(hook_name, context, callback) {
  commentManager.deleteCommentReplies(context.padID, function() {
    commentManager.deleteComments(context.padID, callback);
  });
}
exports.padCopy = function(hook_name, context, callback) {
  commentManager.copyComments(context.originalPad.id, context.destinationID, function() {
    commentManager.copyCommentReplies(context.originalPad.id, context.destinationID, callback);
  });
}

exports.handleMessageSecurity = function(hook_name, context, callback){
  if(context.message && context.message.data && context.message.data.apool){
    var apool = context.message.data.apool;
    if(apool.numToAttrib && apool.numToAttrib[0] && apool.numToAttrib[0][0]){
      if(apool.numToAttrib[0][0] === "comment"){
        // Comment change, allow it to override readonly security model!!
        callback(true);
      }else{
        callback();
      }
    }else{
      callback();
    }
  }else{
    callback();
  }
};

exports.socketio = function (hook_name, args, cb){
  var app = args.app;
  var io = args.io;

  var commentSocket = io
  .of('/comment')
  .on('connection', function (socket) {

    // Join the rooms
    socket.on('getComments', function (data, callback) {
      var padId = data.padId;
      socket.join(padId);
      commentManager.getComments(padId, function (err, comments){
        callback(comments);
      });
    });

    socket.on('getCommentReplies', function (data, callback) {
      var padId = data.padId;
      commentManager.getCommentReplies(padId, function (err, replies){
        callback(replies);
      });
    });

    // On add events
    socket.on('addComment', function (data, callback) {
      var padId = data.padId;
      var content = data.comment;
      commentManager.addComment(padId, content, function (err, commentId, comment){
        socket.broadcast.to(padId).emit('pushAddComment', commentId, comment);
        callback(commentId, comment);
      });
    });

    socket.on('bulkAddComment', function (padId, data, callback) {
      commentManager.bulkAddComments(padId, data, function(error, commentsId, comments){
        socket.broadcast.to(padId).emit('pushAddCommentInBulk');
        var commentWithCommentId = _.object(commentsId, comments); // {c-123:data, c-124:data}
        callback(commentWithCommentId);
      });
    });

    socket.on('bulkAddCommentReplies', function(padId, data, callback){
      commentManager.bulkAddCommentReplies(padId, data, function (err, repliesId, replies){
        socket.broadcast.to(padId).emit('pushAddCommentReplyInBulk', repliesId, replies);
        var repliesWithReplyId = _.object(repliesId, replies); // {cr-123:data, cr-124:data}
        callback(repliesWithReplyId);
      });
    });

    socket.on('updateCommentText', function(data, callback) {
      // Broadcast to all other users that the comment text was changed.
      // Note that commentId here can either be the commentId or replyId..
      var padId = data.padId;
      var commentId = data.commentId;
      var commentText = data.commentText;
      var currentUser = data.currentUser;
      commentManager.changeCommentText(padId, commentId, commentText, currentUser, function(err) {
        if(!err){
          socket.broadcast.to(padId).emit('textCommentUpdated', commentId, commentText);
        }
        callback(err);
      });
    });

    socket.on('addCommentReply', function (data, callback) {
      var padId = data.padId;
      commentManager.addCommentReply(padId, data, function (err, replyId, reply){
        reply.replyId = replyId;
        socket.broadcast.to(padId).emit('pushAddCommentReply', replyId, reply);
        callback(replyId, reply);
      });
    });

    // comment added via API
    socket.on('apiAddComments', function (data) {
      var padId = data.padId;
      var commentIds = data.commentIds;
      var comments = data.comments;

      for (var i = 0, len = commentIds.length; i < len; i++) {
        socket.broadcast.to(padId).emit('pushAddComment', commentIds[i], comments[i]);
      }
    });

    // comment reply added via API
    socket.on('apiAddCommentReplies', function (data) {
      var padId = data.padId;
      var replyIds = data.replyIds;
      var replies = data.replies;

      for (var i = 0, len = replyIds.length; i < len; i++) {
        var reply = replies[i];
        var replyId = replyIds[i];
        reply.replyId = replyId;
        socket.broadcast.to(padId).emit('pushAddCommentReply', replyId, reply);
      }
    });

    socket.on('toggleImportantFlag', function(data, callback) {
      var padId = data.padId;
      var commentId = data.commentId;
      commentManager.toggleImportantFlag(padId, commentId, function (err){
        if(!err){
          socket.broadcast.to(padId).emit('importantCommentUpdated', commentId);
        }
        callback(err);
      });
    });

  });
};

exports.eejsBlock_scripts = function (hook_name, args, cb) {
  args.content = args.content + eejs.require("ep_comments_page/templates/comments.html", {}, module);
  args.content = args.content + eejs.require("ep_comments_page/templates/commentIcons.html", {}, module);
  return cb();
};
