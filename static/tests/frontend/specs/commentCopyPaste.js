describe('ep_comments_page - Comment copy and paste', function() {
  var helperFunctions, originalCommentId, originalReplyId, originalUser, otherUser;
  var utils = ep_comments_page_test_helper.utils;
  var apiUtils = ep_comments_page_test_helper.apiUtils;

  var LINE_WITH_ORIGINAL_COMMENT = 0;
  var LINE_WITH_PASTED_COMMENT = 1;
  var EMPTY_LINE = 2;
  var LINE_WITH_2ND_PASTED_COMMENT = 3;

  var COMMENT_TEXT = 'My comment';
  var REPLY_TEXT = 'A reply';

  before(function(done) {
    helperFunctions = ep_comments_page_test_helper.copyAndPaste;
    utils.createPad(this, function() {
      // make sure all lines are created
      helper.padInner$('div').last().sendkeys('{selectall}{rightarrow}{enter}{enter}one more line');
      helper.waitFor(function() {
        var numberOfLines = helper.padInner$('div').length;
        return numberOfLines >= LINE_WITH_2ND_PASTED_COMMENT + 1;
      }).done(function() {
        // now we can add the comments and replies
        utils.addCommentAndReplyToLine(LINE_WITH_ORIGINAL_COMMENT, COMMENT_TEXT, REPLY_TEXT, function() {
          originalCommentId = utils.getCommentIdOfLine(LINE_WITH_ORIGINAL_COMMENT);
          originalReplyId = utils.getReplyIdOfLine(LINE_WITH_ORIGINAL_COMMENT);

          // reopen the same pad as a different user, so we can test if we're pasting
          // comments with different authors and creators
          originalUser = helper.padChrome$.window.pad.myUserInfo.userId;
          helperFunctions.loadSamePadAsAnotherUser(function() {
            otherUser = helper.padChrome$.window.pad.myUserInfo.userId;
            done();
          })
        });
      });
    });
    this.timeout(60000);
  });

  context('when user copies and pastes a text with comment and reply', function() {
    before(function(done) {
      var $firstLine = helper.padInner$('div').eq(0);
      helper.selectLines($firstLine, $firstLine, 1, 8); //'omethin'

      utils.copySelection();
      utils.pasteOnLine(LINE_WITH_PASTED_COMMENT, function() {
        utils.waitForCommentToBeCreatedOnLine(LINE_WITH_PASTED_COMMENT, done);
      });
    });

    after(function(done) {
      helperFunctions.performActionAndWaitForDataToBeSent(utils.undo, done);
    });

    it('generates a different comment id for the comment pasted', function(done) {
      var commentIdLinePasted = utils.getCommentIdOfLine(LINE_WITH_PASTED_COMMENT);
      expect(commentIdLinePasted).to.not.be(originalCommentId);
      done();
    });

    it('generates a different reply id for the reply pasted', function(done) {
      var replyIdLinePasted = utils.getReplyIdOfLine(LINE_WITH_PASTED_COMMENT);
      expect(replyIdLinePasted).to.not.be(originalReplyId);
      done();
    });

    it('creates a new icon for the comment pasted', function(done) {
      var outer$ = helper.padOuter$;

      helper.waitFor(function() {
        var $commentIcon = outer$('.comment-icon.withReply:visible');
        // 2 = the original comment and the pasted one
        return $commentIcon.length === 2;
      }).done(done);
    });

    it('saves the same author of the original comment', function(done) {
      var author = helperFunctions.getAuthorOfCommentFromLine(LINE_WITH_PASTED_COMMENT);
      expect(author).to.be(originalUser);
      done();
    });

    it('saves the other user as the creator of the pasted comment', function(done) {
      var creator = helperFunctions.getCreatorOfCommentFromLine(LINE_WITH_PASTED_COMMENT);
      expect(creator).to.be(otherUser);
      done();
    });

    it('saves the same text of the original comment', function(done) {
      var commentPastedText = helperFunctions.getTextOfCommentFromLine(LINE_WITH_PASTED_COMMENT);
      expect(commentPastedText).to.be(COMMENT_TEXT);
      done();
    });

    it('saves the same author of the original comment reply', function(done) {
      var author = helperFunctions.getAuthorOfCommentReplyFromLine(LINE_WITH_PASTED_COMMENT);
      expect(author).to.be(originalUser);
      done();
    });

    it('saves the other user as the creator of the pasted comment reply', function(done) {
      var creator = helperFunctions.getCreatorOfCommentReplyFromLine(LINE_WITH_PASTED_COMMENT);
      expect(creator).to.be(otherUser);
      done();
    });

    it('saves the same text of the original comment reply', function(done) {
      var commentReplyText = helperFunctions.getTextOfCommentReplyFromLine(LINE_WITH_PASTED_COMMENT);
      expect(commentReplyText).to.be(REPLY_TEXT);
      done();
    });

    context('and user pastes the same content again on another line', function() {
      before(function(done) {
        apiUtils.resetData();
        utils.pasteOnLine(LINE_WITH_2ND_PASTED_COMMENT, function() {
          utils.waitForCommentToBeCreatedOnLine(LINE_WITH_2ND_PASTED_COMMENT, done);
        });
      });

      after(function(done) {
        helperFunctions.performActionAndWaitForDataToBeSent(utils.undo, done);
      });

      it('generates a different comment id for the comment pasted', function(done) {
        var commentIdOn1stLinePasted = utils.getCommentIdOfLine(LINE_WITH_PASTED_COMMENT);
        var commentIdOn2ndLinePasted = utils.getCommentIdOfLine(LINE_WITH_2ND_PASTED_COMMENT);
        expect(commentIdOn2ndLinePasted).to.not.be(originalCommentId);
        expect(commentIdOn2ndLinePasted).to.not.be(commentIdOn1stLinePasted);
        done();
      });

      it('generates a different reply id for the reply pasted', function(done) {
        var replyIdOn1stLinePasted = utils.getReplyIdOfLine(LINE_WITH_PASTED_COMMENT);
        var replyIdOn2ndLinePasted = utils.getReplyIdOfLine(LINE_WITH_2ND_PASTED_COMMENT);
        expect(replyIdOn2ndLinePasted).to.not.be(originalReplyId);
        expect(replyIdOn2ndLinePasted).to.not.be(replyIdOn1stLinePasted);
        done();
      });

      it('creates a new icon for the comment pasted', function(done) {
        var outer$ = helper.padOuter$;

        helper.waitFor(function() {
          var $commentIcon = outer$('.comment-icon.withReply:visible');
          // 3 = the original comment and the 2 pasted ones
          return $commentIcon.length === 3;
        }).done(done);
      });
    });

    context('when user removes the original comment', function() {
      before(function() {
        apiUtils.simulateCallToDeleteComment(originalCommentId);
      });

      after(function(done) {
        helperFunctions.performActionAndWaitForDataToBeSent(utils.undo, done);
      });

      it('does not remove the comment pasted', function(done) {
        var inner$ = helper.padInner$;
        var commentsLength = inner$('.comment').length;
        expect(commentsLength).to.be(1);
        done();
      });
    });
  });

  context('when user copies and pastes a text with only comment', function() {
    before(function(done) {
      apiUtils.resetData();
      apiUtils.simulateCallToDeleteReply(originalReplyId, originalCommentId);

      // remove reply to run this context
      apiUtils.waitForDataToBeSent(function() {
        var $firstLine = helper.padInner$('div').eq(0);
        helper.selectLines($firstLine, $firstLine, 1, 8); //'omethin'

        utils.copySelection();
        utils.pasteOnLine(LINE_WITH_PASTED_COMMENT, function() {
          utils.waitForCommentToBeCreatedOnLine(LINE_WITH_PASTED_COMMENT, done);
        });
      });
    });

    after(function(done) {
      helperFunctions.performActionAndWaitForDataToBeSent(function() {
        utils.undo(); // paste
        utils.undo(); // reply deletion
      }, done);
    });

    it('generates a different comment id for the comment pasted', function(done) {
      var commentIdLinePasted = utils.getCommentIdOfLine(LINE_WITH_PASTED_COMMENT);
      expect(commentIdLinePasted).to.not.be(originalCommentId);
      done();
    });

    it('creates a new icon for the comment pasted', function(done) {
      var outer$ = helper.padOuter$;

      helper.waitFor(function() {
        var $commentIcon = outer$('.comment-icon:not(.withReply):visible');
        // 2 = the original comment and the pasted one
        return $commentIcon.length === 2;
      }).done(done);
    });

    it('creates the comment text field with the same text of the one copied', function(done) {
      var commentPastedText = helperFunctions.getTextOfCommentFromLine(LINE_WITH_PASTED_COMMENT);
      expect(commentPastedText).to.be(COMMENT_TEXT);
      done();
    });
  });

  context('when user copies and pastes a formatted text with comment and reply - integration with ep_script_copy_cut_paste', function() {
    before(function() {
      var $firstLine = utils.getLine(0);
      helper.selectLines($firstLine, $firstLine); //'something'
      helper.padChrome$('.buttonicon-bold').click();

      var $firstLine = utils.getLine(0);
      helper.selectLines($firstLine, $firstLine, 1, 8); //'omethin'
      helper.padChrome$('.buttonicon-italic').click();

      var $firstLine = utils.getLine(0);
      helper.selectLines($firstLine, $firstLine, 2, 7); //'methi'
      helper.padChrome$('.buttonicon-underline').click();
    });

    var runTests = function(testConfig, targetLine) {
      var targetLineOriginalText;

      context(testConfig.title, function() {
        before(function(done) {
          targetLineOriginalText = utils.cleanText(utils.getLine(targetLine).text());

          var $firstLine = utils.getLine(0);
          helper.selectLines($firstLine, $firstLine, testConfig.start, testConfig.end);

          utils.copySelection();
          utils.pasteOnLine(targetLine, function() {
            utils.waitForCommentToBeCreatedOnLine(targetLine, done);
          });
        });

        after(function(done) {
          helperFunctions.performActionAndWaitForDataToBeSent(utils.undo, done);
        });

        it('pastes the selected text', function(done) {
          var allText = utils.cleanText(utils.getLine(targetLine).text());
          expect(allText).to.be(targetLineOriginalText + testConfig.pastedText);
          done();
        });

        it('pastes a new comment', function(done) {
          var commentIdLinePasted = utils.getCommentIdOfLine(targetLine);
          expect(commentIdLinePasted).to.not.be(undefined);
          done();
        });

        it('pastes a new reply', function(done) {
          var replyIdLinePasted = utils.getReplyIdOfLine(targetLine);
          expect(replyIdLinePasted).to.not.be(undefined);
          done();
        });

        it('pastes content with the outer formatting', function(done) {
          var $pastedContent = utils.getLine(targetLine);
          expect($pastedContent.find('b').length).to.not.be(0);
          done();
        });

        it('pastes content with the formatting in the middle', function(done) {
          var $pastedContent = utils.getLine(targetLine);
          expect($pastedContent.find('i').length).to.not.be(0);
          done();
        });

        it('pastes content with the inner formatting', function(done) {
          var $pastedContent = utils.getLine(targetLine);
          expect($pastedContent.find('u').length).to.not.be(0);
          done();
        });
      });
    }

    var TEST_SCENARIOS = [
      { start: 3, end: 6, pastedText: 'eth', title: 'and selected text has some chars' },
      { start: 4, end: 5, pastedText: 't',   title: 'and selected text has only one char' },
    ];

    context('and target line is empty', function() {
      _(TEST_SCENARIOS).each(function(testConfig) { runTests(testConfig, EMPTY_LINE) });
    });

    // FIXME when pasting one char on a non-empty line, it is not pasting the comment.
    // Uncomment this when bug is fixed
    context.skip('and target line is not empty', function() {
      _(TEST_SCENARIOS).each(function(testConfig) { runTests(testConfig, LINE_WITH_PASTED_COMMENT) });
    });
  });
});

var ep_comments_page_test_helper = ep_comments_page_test_helper || {};
ep_comments_page_test_helper.copyAndPaste = {
  _getDataOfCommentFromLine: function(lineNumber) {
    var utils = ep_comments_page_test_helper.utils;
    return utils.getCommentDataOfLine(lineNumber);
  },
  getAuthorOfCommentFromLine: function(lineNumber) {
    return this._getDataOfCommentFromLine(lineNumber).author;
  },
  getCreatorOfCommentFromLine: function(lineNumber) {
    return this._getDataOfCommentFromLine(lineNumber).creator;
  },
  getTextOfCommentFromLine: function(lineNumber) {
    return this._getDataOfCommentFromLine(lineNumber).text;
  },

  _getDataOfCommentReplyFromLine: function(lineNumber) {
    var utils = ep_comments_page_test_helper.utils;
    var commentData = utils.getCommentDataOfLine(lineNumber);
    var replyIds = Object.keys(commentData.replies);
    return commentData.replies[replyIds[0]];
  },
  getAuthorOfCommentReplyFromLine: function(lineNumber) {
    return this._getDataOfCommentReplyFromLine(lineNumber).author;
  },
  getCreatorOfCommentReplyFromLine: function(lineNumber) {
    return this._getDataOfCommentReplyFromLine(lineNumber).creator;
  },
  getTextOfCommentReplyFromLine: function(lineNumber) {
    return this._getDataOfCommentReplyFromLine(lineNumber).text;
  },

  performActionAndWaitForDataToBeSent: function(action, done) {
    var apiUtils = ep_comments_page_test_helper.apiUtils;
    apiUtils.resetData();
    action();
    // wait until all data is restored
    apiUtils.waitForDataToBeSent(done);
  },

  loadSamePadAsAnotherUser: function(done) {
    var apiUtils = ep_comments_page_test_helper.apiUtils;
    var multipleUsers = ep_script_copy_cut_paste_test_helper.multipleUsers;

    // make sure all changes are saved on text before reloading the pad
    setTimeout(function() {
      apiUtils.resetData();
      multipleUsers.loadSamePadAsAnotherUser(function() {
        // wait until all data is loaded (on pad content and on API)
        helper.waitFor(function() {
          return helper.padInner$('.comment').length > 0;
        }).done(function() {
          apiUtils.waitForDataToBeSent(done);
        });
      });
    }, 1000);
  }
};
