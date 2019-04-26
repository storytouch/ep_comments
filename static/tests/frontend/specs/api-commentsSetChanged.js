describe('ep_comments_page - api - "new data" event', function() {
  var multipleUsers, multipleUsersApiUtils;

  var utils = ep_comments_page_test_helper.utils;
  var apiUtils = ep_comments_page_test_helper.apiUtils;

  var EVENT = apiUtils.NEW_DATA_EVENT;
  var LINE_WITH_PASTED_COMMENT = 0;
  var COMMENT_LINE = 1;

  var testThisUserSendsTheCurrentRevisionOnMessage = function() {
    it('sends the current revision', function(done) {
      helper.waitFor(function() {
        var revisionOnMessage = apiUtils.getLastDataSentOnNewDataEvent().revision;
        var currentRevision = utils.getCurrentRevision();

        return revisionOnMessage === currentRevision;
      }).done(done);
    });
  }

  var testThisUserSendsTheCommentIdsOnMessage = function() {
    it('sends the comment ids', function(done) {
      helper.waitFor(function() {
        var commentsOnText = utils.getCommentIdsOnText().get();
        var commentsOnMessage = apiUtils.getLastDataSentOnNewDataEvent().commentIds;

        return _.isEqual(commentsOnText, commentsOnMessage);
      }).done(done);
    });
  }

  var testOnlyOneUserSendsTheMessage = function() {
    it('sends the message by only one of the users', function(done) {
      helper.waitFor(function() {
        return multipleUsersApiUtils.getNumberOfUsersThatSentEvent(EVENT) > 1;
      }).done(function() {
        expect().fail(function() { return 'API event sent more than once' });
      }).fail(function() {
        // all set, API called only once. We can finish the test
        done();
      });
    });
  }

  var testOnlyThisUserSendsData = function() {
    testThisUserSendsTheCurrentRevisionOnMessage();
    testThisUserSendsTheCommentIdsOnMessage();
    testOnlyOneUserSendsTheMessage();
  }

  var resetApiEvents = function() {
    apiUtils.resetData();
    multipleUsersApiUtils.resetCounterOfEvent(EVENT);
  }

  before(function (done) {
    multipleUsers = ep_script_copy_cut_paste_test_helper.multipleUsers;
    multipleUsersApiUtils = ep_script_copy_cut_paste_test_helper.multipleUsersApiUtils;

    utils.createPad(this, function() {
      multipleUsers.openSamePadOnWithAnotherUser(done);
    });
  });

  context('when this user creates a comment', function() {
    before(function(done) {
      utils.addCommentToLine(COMMENT_LINE, 'comment text', done);
    });

    testOnlyThisUserSendsData();

    context('and this user deletes one comment', function() {
      before(function() {
        resetApiEvents();

        var commentId = utils.getCommentIdOfLine(COMMENT_LINE);
        apiUtils.simulateCallToDeleteComment(commentId);
      });

      testOnlyThisUserSendsData();

      context('then reverts the deletion', function() {
        before(function(done) {
          resetApiEvents();
          utils.undo();
          // wait for comment to be restored
          utils.waitForCommentToBeCreatedOnLine(COMMENT_LINE, done);
        });

        testOnlyThisUserSendsData();
      });
    });

    context('and this user deletes the text of one comment', function() {
      before(function() {
        var smUtils = ep_script_scene_marks_test_helper.utils;

        var $lineWithComment = utils.getLine(COMMENT_LINE);
        helper.selectLines($lineWithComment, $lineWithComment);

        resetApiEvents();
        smUtils.pressBackspace();
      });

      testOnlyThisUserSendsData();

      context('then reverts the deletion', function() {
        before(function(done) {
          resetApiEvents();
          utils.undo();
          // wait for comment to be restored
          utils.waitForCommentToBeCreatedOnLine(COMMENT_LINE, done);
        });

        testOnlyThisUserSendsData();
      });
    });

    context('and this user pastes text with a comment', function() {
      before(function(done) {
        var $lineWithComment = utils.getLine(COMMENT_LINE);
        helper.selectLines($lineWithComment, $lineWithComment);
        utils.copySelection();

        resetApiEvents();
        utils.pasteOnLine(LINE_WITH_PASTED_COMMENT, function() {
          utils.waitForCommentToBeCreatedOnLine(LINE_WITH_PASTED_COMMENT, done);
        });
      });

      testOnlyThisUserSendsData();

      context('then reverts the paste', function() {
        before(function() {
          resetApiEvents();
          utils.undo();
        });

        testOnlyThisUserSendsData();
      });
    });
  });
});
