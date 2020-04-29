var       supertest = require('ep_etherpad-lite/node_modules/supertest'),
                 io = require('socket.io-client'),
              utils = require('../../utils'),
          createPad = utils.createPad,
         readOnlyId = utils.readOnlyId,
      createComment = utils.createComment,
             appUrl = utils.appUrl,
             apiKey = utils.apiKey,
          codeToBe0 = utils.codeToBe0,
          codeToBe1 = utils.codeToBe1,
          codeToBe4 = utils.codeToBe4,
commentsEndPointFor = utils.commentsEndPointFor,
      updateComment = utils.updateComment,
    expectValueToBe = utils.expectValueToBe,
toggleImportantFlag = utils.toggleImportantFlag,
                api = supertest(appUrl);

describe('get comments API', function() {
  var padID;

  //create a new pad before each test run
  beforeEach(function(done){
    createPad(function(err, newPadID) {
      padID = newPadID;
      done(err);
    });
  });

  it('returns code 4 if API key is missing', function(done) {
    api.get(listCommentsEndPointFor(padID))
    .expect(codeToBe4)
    .expect('Content-Type', /json/)
    .expect(401, done)
  });

  it('returns code 4 if API key is wrong', function(done) {
    api.get(listCommentsEndPointFor(padID, 'wrongApiKey'))
    .expect(codeToBe4)
    .expect('Content-Type', /json/)
    .expect(401, done)
  });

  it('returns code 0 when API key is provided', function(done) {
    api.get(listCommentsEndPointFor(padID, apiKey))
    .expect(codeToBe0)
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('returns comment list when API key is provided', function(done) {
    // creates first comment...
    createComment(padID, {},function(err, comment) {
      // ... creates second comment...
      createComment(padID, {},function(err, comment) {
        // ... and finally checks if comments are returned
        api.get(listCommentsEndPointFor(padID, apiKey))
        .expect(function(res){
          if(res.body.data.comments === undefined) throw new Error("Response should have list of comments.");
          var commentIds = Object.keys(res.body.data.comments);
          if(commentIds.length !== 2) throw new Error("Response should have two comments.");
        })
        .end(done);
      });
    });
  });

  it('returns comment data', function(done){
    var author    = "author";
    var creator   = "creator";
    var name      = "name";
    var text      = "text";
    var timestamp = 1440671727068;

    var data = {
      author: author,
      creator: creator,
      name: name,
      text: text,
      timestamp: timestamp,
    };

    createComment(padID, data, function(err, commentId){
      api.get(listCommentsEndPointFor(padID, apiKey))
      .expect(function(res){
        var comment_data = res.body.data.comments[commentId];
        expectValueToBe('author', comment_data.author, author);
        expectValueToBe('creator', comment_data.creator, creator);
        expectValueToBe('name', comment_data.name, name);
        expectValueToBe('text', comment_data.text, text);
        expectValueToBe('timestamp', comment_data.timestamp, timestamp);
      })
      .end(done);
    })
  });

  it('returns same data for read-write and read-only pad ids', function(done){
    createComment(padID, {}, function(err, commentId){
      api.get(listCommentsEndPointFor(padID, apiKey))
      .end(function(err, res) {
        var rwData = JSON.stringify(res.body.data);
        readOnlyId(padID, function(err, roPadId) {
          api.get(listCommentsEndPointFor(roPadId, apiKey))
          .expect(function(res){
            var roData = JSON.stringify(res.body.data);
            if(roData != rwData) throw new Error("Read-only and read-write data don't match. Read-only data: " + roData + ", read-write data: " + rwData);
          })
          .end(done);
        });
      });
    });
  });
});

describe('create comments API', function(){
  var padID;

  //create a new pad before each test run
  beforeEach(function(done){
    createPad(function(err, newPadID) {
      padID = newPadID;
      done(err);
    });
  });

  it('returns code 1 if data is missing', function(done) {
    api.post(commentsEndPointFor(padID))
    .field('apikey', apiKey)
    .expect(codeToBe1)
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('returns code 1 if data is not a JSON', function(done) {
    api.post(commentsEndPointFor(padID))
    .field('apikey', apiKey)
    .field('data', 'not a JSON')
    .expect(codeToBe1)
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('returns code 4 if API key is missing', function(done) {
    api.post(commentsEndPointFor(padID))
    .field('data', commentsData())
    .expect(codeToBe4)
    .expect('Content-Type', /json/)
    .expect(401, done)
  });

  it('returns code 4 if API key is wrong', function(done) {
    api.post(commentsEndPointFor(padID))
    .field('apikey', 'wrongApiKey')
    .field('data', commentsData())
    .expect(codeToBe4)
    .expect('Content-Type', /json/)
    .expect(401, done)
  });

  it('returns code 0 when comment is successfully added', function(done) {
    api.post(commentsEndPointFor(padID))
    .field('apikey', apiKey)
    .field('data', commentsData())
    .expect(codeToBe0)
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('returns comment ids when comment is successfully added', function(done) {
    var twoComments = commentsData([commentData(), commentData()]);
    api.post(commentsEndPointFor(padID))
    .field('apikey', apiKey)
    .field('data', twoComments)
    .expect(function(res){
      if(res.body.commentIds === undefined) throw new Error("Response should have commentIds.");
      if(res.body.commentIds.length !== 2) throw new Error("Response should have two comment ids.");
    })
    .end(done)
  });

  context('when pad already have comments', function() {
    it('returns only the new comment ids', function(done) {
      createComment(padID, {}, function(err, touch) {
        var twoComments = commentsData([commentData(), commentData()]);
        api.post(commentsEndPointFor(padID))
        .field('apikey', apiKey)
        .field('data', twoComments)
        .expect(function(res) {
          if(res.body.commentIds === undefined) throw new Error("Response should have commentIds.");
          if(res.body.commentIds.length !== 2) throw new Error("Response should have two comment ids.");
        })
        .end(done)
      });
    });
  });
})

describe('create comment API broadcast', function(){
  var padID;
  var timesMessageWasReceived;

  // NOTE: this hook will timeout if you don't run your Etherpad in
  // loadTest mode by setting ALLOW_LOAD_TESTING=true in the .env file
  // of etherpad-docker. Finally, rebuild and restart the container.
  beforeEach(function(done){
    timesMessageWasReceived = 0;

    //create a new pad before each test run...
    createPad(function(err, newPadID) {
      if (err) throw err;
      padID = newPadID;

      // ... and listens to the broadcast message:
      var socket = io.connect(appUrl + "/comment");
      var req = { padId: padID };
      // needs to get comments to be able to join the pad room, where the messages will be broadcast to:
      socket.emit('getComments', req, function (res){
        socket.on('pushAddComment', function(data) {
          ++timesMessageWasReceived;
        });

        done();
      });
    });
  });

  it('broadcasts comment creation to other clients of same pad', function(done) {
    // create first comment...
    createComment(padID, {}, function(err, commentId) {
      if(err) throw err;
      if(!commentId) throw new Error("Comment should had been created");

      // ... create second comment...
      createComment(padID, {}, function(err, commentId) {
        if(err) throw err;
        if(!commentId) throw new Error("Comment should had been created");

        // ... then check if both messages were received
        setTimeout(function() { //give it some time to process the messages on the client
          if(timesMessageWasReceived !== 2) throw new Error("Message should had been received");
          done();
        }, 100);
      });
    });
  });

  it('does not broadcast comment creation to clients of different pad', function(done) {
    // creates another pad...
    createPad(function(err, otherPadId) {
      if(err) throw err;

      // ... and add comment to it:
      createComment(otherPadId, {}, function(err, commentId) {
        if(err) throw err;
        if(!commentId) throw new Error("Comment should had been created");

        setTimeout(function() { //give it some time to process the message on the client
          if(timesMessageWasReceived !== 0) throw new Error("Message should had been received only for pad " + padID);
          done();
        }, 100);
      });
    });
  });
})

describe('update comments API broadcast', function(){
  var padID, commentIdToEdit, socket;
  beforeEach(function(done){
    createPad(function(err, newPadID) {
      if (err) throw err;
      padID = newPadID;
      socket = io.connect(appUrl + "/comment");

      createComment(padID, {author: "a.authorid"}, function(err, commentId) {
        if(err) throw err;
        if(!commentId) throw new Error("Comment should had been created");
        commentIdToEdit = commentId;
        done();
      });
    });
  });

  it('updates the text of the comment', function(done){
    var newText = 'comment updated!';
    var data = {
      currentUser: "a.authorid",
      padId: padID,
      commentId: commentIdToEdit,
      commentText: newText,
    }

    updateCommentAndGetListOfComments(data, socket, function(res){
      validateCommentText(res, commentIdToEdit, newText);
    }, done);
  });

  context('when comment text is empty', function(){
    it('does not save the comment text', function (done) {
      var originalCommentText = 'This is a comment';
      var newText = '';
      var data = {
        padId: padID,
        commentId: commentIdToEdit,
        commentText: newText,
      }

      updateCommentAndGetListOfComments(data, socket, function(res){
        validateCommentText(res, commentIdToEdit, originalCommentText);
      }, done);
    });
  })

  context('when it tries to update a comment that does not exists', function(){
    it('returns an error', function(done){ // when an error happens the callback returns true
      var nonExistentCommentId = 'c-noExist123';
      var newText = 'anything';
      var data = {
        padId: padID,
        commentId: nonExistentCommentId,
        commentText: newText,
      }
      updateComment(data, socket, function(error){
        if (error !== true) {
          throw new Error("It should return an error");
        }
        done();
      })
    })
  });

  context('when a user that is not the comment owner tries to update it', function() {
    it('returns an error', function(done) {
      var newText = 'anything';
      var data = {
        currentUser: 'a.notAuthor',
        padId: padID,
        commentId: commentIdToEdit,
        commentText: newText,
      }
      updateComment(data, socket, function(error){
        if (error !== true) {
          throw new Error("It should return an error");
        }
        done();
      })
    })
  })

  it('updates the important flag of the comment', function(done){
    var data = {
      padId: padID,
      commentId: commentIdToEdit,
    }

    toggleImportantFlagAndGetListOfComments(data, socket, function(res){
      validateCommentImportantFlag(res, commentIdToEdit, true);
    }, done);
  });
})

describe('bulk adding comments API', function(){
  var padId, socket;
  beforeEach(function(done){
    createPad(function(err, newPadID) {
      if (err) throw err;
      padId = newPadID;
      socket = io.connect(appUrl + "/comment");
      done();
    });
  });

  it('adds a bulk of comments', function(done){
    var firstCommentId = 'c-aLongCommentID12';
    var secondCommentId = 'c-aLongCommentID34';
    var firstComment = _buildComment(commentData(), firstCommentId, padId);
    var secondComment = _buildComment(commentData(), secondCommentId, padId);

    addCommentsInBulk(socket, padId, [firstComment, secondComment], function(comments){ // add 2 comments
      api.get(listCommentsEndPointFor(padId, apiKey)) // get the list of the comments
      .expect(function(res){
        var commentKeys = Object.keys(res.body.data.comments);
        var hasFirstComment = commentKeys.includes(firstCommentId);
        var hasSecondComment = commentKeys.includes(secondCommentId);
        var savedTheTwoComments = commentKeys.length === 2 && hasFirstComment && hasSecondComment;
        if (!savedTheTwoComments) {
          throw new Error("It should save two comments");
        }
      })
      .end(done);
    });
  })

  context('when a comment added has not text field', function(){
    it('does not save it', function (done) {
      var firstCommentId = 'c-aLongCommentID12';
      var emptyCommentId = 'c-anEmptyComment34';
      var emptyTextComment = {
        name: 'The Author',
        text: ''
      };

      // we create two comments, only the first one is valid
      var firstComment = _buildComment(commentData(), firstCommentId, padId);
      var emptyComment = _buildComment(emptyTextComment, emptyCommentId, padId);

      addCommentsInBulk(socket, padId, [firstComment, emptyComment], function(comments){
        api.get(listCommentsEndPointFor(padId, apiKey)) // get the list of the comments
        .expect(function(res){
          var emptyComment = res.body.data.comments[emptyCommentId];
          var firstComment = res.body.data.comments[firstCommentId];

          if (Object.keys(res.body.data.comments).length !== 1 || !firstComment) {
            throw new Error("It should save only the comment with id " + firstCommentId);
          }

          if (emptyComment) {
            throw new Error("It should not save a comment with empty text");
          }
        })
        .end(done);
      });
    });
  })
})

var addCommentsInBulk = function(socket, padId, commentData, cb) {
  socket.emit('bulkAddComment', padId, commentData, function(commentsAdded){
    cb(commentsAdded);
  });
}

var _buildComment = function(commentData, commentId, padId){
  var data = {};
  data.padId = padId;
  data.commentId = commentId;
  data.text = commentData.text;
  data.name = commentData.name;

  return data;
}

var validateCommentText = function(res, commentId, expectedCommentText) {
  var comment_data = res.body.data.comments[commentId];
  if(comment_data.text !== expectedCommentText) {
    throw new Error("Wrong text. Expected: " + expectedCommentText + ", got: " + comment_data.text);
  }
}

var validateCommentImportantFlag = function(res, commentId, expectedFlagValue) {
  var comment_data = res.body.data.comments[commentId];
  if(comment_data.important !== expectedFlagValue) {
    throw new Error("Wrong value for important flag. Expected: " + expectedFlagValue + ", got: " + comment_data.important);
  }
}

var updateCommentAndGetListOfComments = function(commentData, socket, callbackValidator, done) {
  updateComment(commentData, socket, function(){
    api.get(listCommentsEndPointFor(commentData.padId, apiKey))
      .expect(callbackValidator)
      .end(done);
  });
}

var toggleImportantFlagAndGetListOfComments = function(commentData, socket, callbackValidator, done) {
  toggleImportantFlag(commentData, socket, function(){
    api.get(listCommentsEndPointFor(commentData.padId, apiKey))
      .expect(callbackValidator)
      .end(done);
  });
}

var listCommentsEndPointFor = function(padID, apiKey) {
  var extraParams = "";
  if (apiKey) {
    extraParams = "?apikey=" + apiKey;
  }
  return commentsEndPointFor(padID) + extraParams;
}

var commentsData = function(comments) {
  if (!comments) comments = [commentData()];

  return JSON.stringify(comments);
}

var commentData = function() {
  return { name: 'The Author', text: 'The Comment Text' };
}
