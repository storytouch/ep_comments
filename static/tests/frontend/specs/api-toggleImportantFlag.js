describe('ep_comments_page - Important flag', function() {
  var utils = ep_comments_page_test_helper.utils;
  var apiUtils = ep_comments_page_test_helper.apiUtils;

  var COMMENT_LINE = 0;
  var commentId;

  var createScript = function(test, cb) {
    var smUtils = ep_script_scene_marks_test_helper.utils;
    var generalText = 'general';
    var lastLineText = 'scene 1';
    var script = smUtils.general(generalText) + smUtils.createEpi(lastLineText);
    utils.createPad(test, cb, script, lastLineText);
  }

  var getCommentId = function() {
    commentId = utils.getCommentIdOfLine(COMMENT_LINE);
  }

  var createCommentOnLine = function(cb) {
    utils.addCommentToLine(COMMENT_LINE, 'One comment', cb);
  }

  var makeOtherUserToggleCommentImportantFlag = function(done) {
    var multipleUsers = ep_script_copy_cut_paste_test_helper.multipleUsers;

    multipleUsers.openSamePadOnWithAnotherUser(function() {
      multipleUsers.performAsOtherUser(function(cb) {
        apiUtils.simulateCallToToggleImportantFlag(commentId);
        cb();
      }, done);
    });
  }

  var testIfCommentHasImportantFlagWithValue = function(flagValue, done) {
    helper.waitFor(function() {
      var comment = apiUtils.getCommentData(commentId);
      return comment.important === flagValue;
    }).done(done);
  }

  before(function(done) {
    createScript(this, function(){
      createCommentOnLine(function(){
        getCommentId();
        done();
      });
    });
    this.timeout(60000);
  });

  after(function() {
    // undo frame resize that was done on before()
    utils.resetScreenSize();
  });

  context('when another user marks a comment as important', function() {
    before(function(done) {
      this.timeout(60000);
      makeOtherUserToggleCommentImportantFlag(done);
    });

    it('sends updated data of the important comment', function(done) {
      testIfCommentHasImportantFlagWithValue(true, done);
    });

    it('sends updated data for the other user', function(done) {
      var multipleUsers = ep_script_copy_cut_paste_test_helper.multipleUsers;

      multipleUsers.performAsOtherUser(function() {
        testIfCommentHasImportantFlagWithValue(true, done);
      });
    });
  });

  context('when another user marks a important comment as not important', function() {
    before(function(done) {
      this.timeout(60000);
      makeOtherUserToggleCommentImportantFlag(done);
    });

    it('sends updated data of the important comment', function(done) {
      testIfCommentHasImportantFlagWithValue(false, done);
    });

    it('sends updated data for the other user', function(done) {
      var multipleUsers = ep_script_copy_cut_paste_test_helper.multipleUsers;

      multipleUsers.performAsOtherUser(function() {
        testIfCommentHasImportantFlagWithValue(false, done);
      });
    });
  });
});
