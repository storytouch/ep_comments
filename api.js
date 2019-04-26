var formidable = require('formidable');
var clientIO = require('socket.io-client');

var apiUtils = require('./apiUtils');
var comments = require('./comments');

exports.expressCreateServer = function (hook_name, args, callback) {
  args.app.get('/p/:pad/:rev?/comments', function(req, res) {
    var fields = req.query;
    // check the api key
    if(!apiUtils.validateApiKey(fields, res)) return;

    // sanitize pad id before continuing
    var padIdReceived = apiUtils.sanitizePadId(req);

    comments.getPadComments(padIdReceived, function(err, data) {
      if(err) {
        res.json({code: 2, message: "internal error", data: null});
      } else {
        res.json({code: 0, data: data});
      }
    });
  });

  args.app.post('/p/:pad/:rev?/comments', function(req, res) {
    new formidable.IncomingForm().parse(req, function (err, fields, files) {
      // check the api key
      if(!apiUtils.validateApiKey(fields, res)) return;

      // check required fields from comment data
      if(!apiUtils.validateRequiredFields(fields, ['data'], res)) return;

      // sanitize pad id before continuing
      var padIdReceived = apiUtils.sanitizePadId(req);

      // create data to hold comment information:
      try {
        var data = JSON.parse(fields.data);

        comments.bulkAddPadComments(padIdReceived, data, function(err, commentIds, comments) {
          if(err) {
            res.json({code: 2, message: "internal error", data: null});
          } else {
            broadcastCommentsAdded(padIdReceived, commentIds, comments);
            res.json({code: 0, commentIds: commentIds});
          }
        });
      } catch(e) {
        res.json({code: 1, message: "data must be a JSON", data: null});
      }
    });
  });

  args.app.get('/p/:pad/:rev?/commentReplies', function(req, res){
    //it's the same thing as the formidable's fields
    var fields = req.query;
    // check the api key
    if(!apiUtils.validateApiKey(fields, res)) return;

    //sanitize pad id before continuing
    var padIdReceived = apiUtils.sanitizePadId(req);

    // call the route with the pad id sanitized
    comments.getPadCommentReplies(padIdReceived, function(err, data) {
      if(err) {
        res.json({code: 2, message: "internal error", data:null})
      } else {
        res.json({code: 0, data: data});
      }
    });
  });

  args.app.post('/p/:pad/:rev?/commentReplies', function(req, res) {
    new formidable.IncomingForm().parse(req, function (err, fields, files) {
      // check the api key
      if(!apiUtils.validateApiKey(fields, res)) return;

      // check required fields from comment data
      if(!apiUtils.validateRequiredFields(fields, ['data'], res)) return;

      // sanitize pad id before continuing
      var padIdReceived = apiUtils.sanitizePadId(req);

      // create data to hold comment reply information:
      try {
        var data = JSON.parse(fields.data);

        comments.bulkAddPadCommentReplies(padIdReceived, data, function(err, replyIds, replies) {
          if(err) {
            res.json({code: 2, message: "internal error", data: null});
          } else {
            broadcastCommentRepliesAdded(padIdReceived, replyIds, replies);
            res.json({code: 0, replyIds: replyIds});
          }
        });
      } catch(e) {
        res.json({code: 1, message: "data must be a JSON", data: null});
      }
    });
  });

}

var broadcastCommentsAdded = function(padId, commentIds, comments) {
  var socket = clientIO.connect(broadcastUrl);

  var data = {
    padId: padId,
    commentIds: commentIds,
    comments: comments
  };

  socket.emit('apiAddComments', data);
}

var broadcastCommentRepliesAdded = function(padId, replyIds, replies) {
  var socket = clientIO.connect(broadcastUrl);

  var data = {
    padId: padId,
    replyIds: replyIds,
    replies: replies
  };

  socket.emit('apiAddCommentReplies', data);
}

var broadcastUrl = apiUtils.broadcastUrlFor("/comment");
