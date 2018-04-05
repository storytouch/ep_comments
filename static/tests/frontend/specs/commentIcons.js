describe('ep_comments_page - Comment icons', function() {
  var utils = ep_comments_page_test_helper.utils;
  var apiUtils = ep_comments_page_test_helper.apiUtils;

  var FIRST_COMMENT_LINE = 0;
  var SECOND_COMMENT_LINE = 1;
  var MULTILINE_COMMENT = [2, 5];
  var COMMENT_LINE_OF_OTHER_USER = 10;
  var firstCommentId, secondCommentId, multLineCommentId;

  var createScript = function(test, cb) {
    var smUtils = ep_script_scene_marks_test_helper.utils;
    var generalText = 'general';
    var lastLineText = 'scene 1';
    var script = smUtils.general(generalText) + smUtils.general(generalText) + smUtils.createEpi(lastLineText);
    utils.createPad(test, cb, script, lastLineText);
  }

  var getCommentIds = function() {
    firstCommentId = utils.getCommentIdOfLine(FIRST_COMMENT_LINE);
    secondCommentId = utils.getCommentIdOfLine(SECOND_COMMENT_LINE);
    multLineCommentId = utils.getCommentIdOfLine(MULTILINE_COMMENT[0]); // use the first line commented to get the commentId
  }

  var createCommentsOnLines = function(cb) {
    utils.addCommentToLine(FIRST_COMMENT_LINE, 'One comment', function(){
      utils.addCommentToLine(SECOND_COMMENT_LINE, 'Another comment', function(){
        utils.addCommentToLines(MULTILINE_COMMENT, 'MultiLines', cb);
      });
    });
  }

  var areLinesWithCommetIdVisible = function(commentId) {
    var $linesWithCommentId = helper.padInner$('.' + commentId);
    return _.every($linesWithCommentId, function(line){
      var isLineVisible = line.getBoundingClientRect().height;
      return isLineVisible;
    });
  }

  var testIfCaretIsAtBeginningOfCommentedText = function(line) {
    it('places the caret at beginning of commented text', function(done) {
      var $lineWithComment = utils.getLine(line);
      var $lineWithCaret = utils.getLineWhereCaretIs();

      expect($lineWithCaret.get(0)).to.be($lineWithComment.get(0));

      done();
    });
  }

  var checkIfHasCreatedTwoMoreLinesOnUserBrowser = function(originalNumberOfLines, cb) {
    helper.waitFor(function(){
      var numberOfLines = helper.padInner$('div').length;
      return numberOfLines === originalNumberOfLines + 2;
    }).done(cb);
  }

  var createTwoLinesOnTopOfScriptOnOtherUserBrowser = function(done) {
    var multipleUsers = ep_script_copy_cut_paste_test_helper.multipleUsers;
    multipleUsers.openSamePadOnWithAnotherUser(function() {
      multipleUsers.performAsOtherUser(function(cb) {
        createTwoLinesOnTopOfScript(cb);
      }, done);
    });
  }

  var createTwoLinesOnTopOfScript = function(done) {
    var originalNumberOfLines = helper.padInner$('div').length;

    // we need to run sendKeys in the same jQuery instance of the browser
    var $firstTextElement = helper.padChrome$(helper.padInner$('div').first());
    $firstTextElement.sendkeys('{selectall}{leftarrow}new line{enter}new line{enter}');

    // wait until the new lines are split into separated .ace-line's
    helper.waitFor(function() {
      var currentNumberOfLines = helper.padInner$('div').length;
      return currentNumberOfLines === originalNumberOfLines + 2;
    }).done(done);
  }

  function testIfSendCommentIdOnAPI (commentId) {
    it('sends the comment id on the API', function(done) {
      var activatedComment = apiUtils.getLastActivatedComment();
      expect(activatedComment).to.be(commentId);
      done();
    });
  }

  before(function(done) {
    createScript(this, function(){
      createCommentsOnLines(function(){
        getCommentIds();
        done();
      });
    });
    this.timeout(60000);
  });

  after(function() {
    // undo frame resize that was done on before()
    utils.resetScreenSize();
  });

  it('adds a comment icon on the same height of commented text', function(done) {
    var $commentIcon = helper.padOuter$('#commentIcons #icon-' + firstCommentId);

    // check icon exists
    expect($commentIcon.length).to.be(1);

    // check height is the same
    var $commentedText = helper.padInner$('.' + firstCommentId);
    var expectedTop = $commentedText.offset().top + 2; // all icons are +2px down to adjust position
    expect($commentIcon.offset().top).to.be(expectedTop);

    done();
  });

  context('when comment has a reply and pad is reloaded', function() {
    before(function(done) {
      apiUtils.simulateCallToCreateReply(firstCommentId, 'anything');

      // wait for reply to be saved
      var test = this;
      helper.waitFor(function() {
        var $commentIcon = helper.padOuter$('#commentIcons #icon-' + firstCommentId);
        return $commentIcon.hasClass('withReply');
      }).done(function() {
        utils.reloadPad(test, done);
      });
    });

    it('loads the comment icon with reply', function(done) {
      helper.waitFor(function() {
        var $commentIcon = helper.padOuter$('#commentIcons #icon-' + firstCommentId);
        return $commentIcon.hasClass('withReply');
      }).done(done);
    });
  });

  context('when commented text is removed', function() {
    before(function() {
      var $commentedLine = helper.padInner$('div .comment').first().parent();
      $commentedLine.sendkeys('{selectall}'); // select all
      $commentedLine.sendkeys('{del}'); // clear the line
    });

    after(function() {
      utils.undo();
    });

    it('does not show comment icon', function(done) {
      helper.waitFor(function() {
        // check icon is not visible
        var $commentIcons = helper.padOuter$('#commentIcons #icon-' + firstCommentId + ':visible');
        return $commentIcons.length === 0;
      }, 2000).done(done);
    });
  });

  context('when comment is deleted', function() {
    before(function(done) {
      apiUtils.simulateCallToDeleteComment(firstCommentId);

      helper.waitFor(function() {
        return utils.getCommentIdOfLine(FIRST_COMMENT_LINE) === null;
      }).done(done);
    });

    after(function() {
      utils.undo();
    });

    it('does not show comment icon', function(done) {
      helper.waitFor(function() {
        // check icon is not visible
        var $commentIcons = helper.padOuter$('#commentIcons #icon-' + firstCommentId + ':visible');
        return $commentIcons.length === 0;
      }, 2000).done(done);
    });
  });

  context('when commented text is moved to another line', function() {
    before(function(done) {
      // adds some new lines on the beginning of the text
      var $firstTextElement = helper.padInner$('div').first();
      $firstTextElement.sendkeys('{selectall}{leftarrow}{enter}{enter}');

      // wait until the new lines are split into separated .ace-line's
      helper.waitFor(function() {
        return helper.padInner$('div').length > 2;
      }).done(function() {
        // wait until comment is visible again
        helper.waitFor(function() {
          var $commentIcons = helper.padOuter$('#commentIcons .comment-icon:visible');
          return $commentIcons.length !== 0;
        }).done(done);
      });
    });

    after(function() {
      utils.undo();
    });

    it('updates comment icon height', function(done) {
      this.timeout(5000);
      // icon might take some time to go to the correct position
      helper.waitFor(function() {
        // check height is the same
        var $commentIcon = helper.padOuter$('#commentIcons #icon-' + firstCommentId);
        var $commentedText = helper.padInner$('.' + firstCommentId);
        var expectedTop = $commentedText.offset().top + 2; // all icons are +2px down to adjust position
        return $commentIcon.offset().top === expectedTop;
      }, 4000).done(done);
    });
  });

  context('when user clicks on comment icon', function() {
    var nonHighlighted;

    before(function(done) {
      // get original value for future comparison on the tests
      nonHighlighted = utils.getBackgroundColorOf(firstCommentId);

      // place caret out of line with commented text
      ep_script_elements_test_helper.utils.placeCaretOnLine(SECOND_COMMENT_LINE, function() {
        utils.clickOnCommentIcon(firstCommentId);
        done();
      });
    });

    testIfCaretIsAtBeginningOfCommentedText(FIRST_COMMENT_LINE);

    it('highlights the comment on editor', function(done) {
      var commentTextStyle = utils.getBackgroundColorOf(firstCommentId);
      expect(commentTextStyle).to.not.be(nonHighlighted);
      done();
    });

    it('sends the comment id on the API', function(done) {
      var activatedComment = apiUtils.getLastActivatedComment();
      expect(activatedComment).to.be(firstCommentId);
      done();
    });

    context('and user clicks again on the icon', function() {
      before(function() {
        utils.clickOnCommentIcon(firstCommentId);
      });
      after(function() {
        // activate comment again, as on before() we've deactivated it
        utils.clickOnCommentIcon(firstCommentId);
      });

      it('sends an undefined comment id on the API', function(done) {
        var activatedComment = apiUtils.getLastActivatedComment();
        expect(activatedComment).to.be(undefined);
        done();
      });

      it('removes the highlight of the comment on editor', function(done) {
        var commentTextStyle = utils.getBackgroundColorOf(firstCommentId);
        expect(commentTextStyle).to.be(nonHighlighted);
        done();
      });
    });

    context('and user clicks outside of comment box', function() {
      before(function() {
        helper.padOuter$('#outerdocbody').click();
      });
      after(function() {
        // activate comment again, as on before() we've deactivated it
        utils.clickOnCommentIcon(firstCommentId);
      });

      it('sends an undefined comment id on the API', function(done) {
        var activatedComment = apiUtils.getLastActivatedComment();
        expect(activatedComment).to.be(undefined);
        done();
      });

      it('removes the highlight of the comment on editor', function(done) {
        var commentTextStyle = utils.getBackgroundColorOf(firstCommentId);
        expect(commentTextStyle).to.be(nonHighlighted);
        done();
      });
    });

    context('and user clicks on another comment icon', function() {
      before(function() {
        utils.clickOnCommentIcon(secondCommentId);
      });
      after(function() {
        // activate original comment again, as on before() we've deactivated it
        utils.clickOnCommentIcon(firstCommentId);
      });

      it('sends the id of the last comment clicked on the API', function(done) {
        var activatedComment = apiUtils.getLastActivatedComment();
        expect(activatedComment).to.be(secondCommentId);
        done();
      });

      it('removes the highlight of the comment on editor', function(done) {
        var commentTextStyle = utils.getBackgroundColorOf(firstCommentId);
        expect(commentTextStyle).to.be(nonHighlighted);
        done();
      });
    });

    context('and comment icon is from a scene mark hidden', function() {
      before(function () {
        utils.clickOnCommentIcon(multLineCommentId);
      });

      it('shows the scene mark hidden', function (done) {
        var linesWithCommentIdAreVisible = areLinesWithCommetIdVisible(multLineCommentId);
        expect(linesWithCommentIdAreVisible).to.be(true)
        done();
      });

      testIfCaretIsAtBeginningOfCommentedText(MULTILINE_COMMENT[0]);

      it('highlights the comment on editor', function(done) {
        var commentTextStyle = utils.getBackgroundColorOf(multLineCommentId);
        expect(commentTextStyle).to.not.be(nonHighlighted);
        done();
      });

      it('shows the comment icon on the first scene mark commented', function(done) {
        this.timeout(5000);

        var $commentIcon = helper.padOuter$('#commentIcons #icon-' + multLineCommentId);
        var $firstLineCommented = helper.padInner$('.' + multLineCommentId).first();
        var expectedTop = $firstLineCommented.offset().top + 2; // all icons are +2px down to adjust position

        // icon might take some time to go to the correct position
        helper.waitFor(function() {
          return $commentIcon.offset().top === expectedTop;
        }, 4000).done(done);
      });
    });
  });

  context('when another user creates a comment on pad', function() {
    var originalIconCount;
    var COMMENT_TEXT = 'Comment of other user';

    before(function(done) {
      this.timeout(60000);
      var multipleUsers = ep_script_copy_cut_paste_test_helper.multipleUsers;

      originalIconCount = helper.padOuter$('.comment-icon').length;

      multipleUsers.openSamePadOnWithAnotherUser(function() {
        multipleUsers.performAsOtherUser(function(cb) {
          utils.addCommentToLine(COMMENT_LINE_OF_OTHER_USER, COMMENT_TEXT, cb);
        }, done);
      });
    });

    it('creates a comment icon for both users', function(done) {
      helper.waitFor(function() {
        var $commentIcons = helper.padOuter$('.comment-icon');
        var allIconsWereCreated = $commentIcons.length === originalIconCount + 1;
        return allIconsWereCreated;
      }, 2000).done(done);
    });

    it('sends the data of created comment', function(done) {
      var comments = apiUtils.getLastDataSent();

      expect(comments.length).to.be(originalIconCount + 1);
      expect(comments[comments.length - 1].text).to.be(COMMENT_TEXT);

      done();
    });
  });

  context('when another user updates a line with comment', function() {
    var originalNumberOfLines;
    before(function (done) {
      this.timeout(60000);
      originalNumberOfLines = helper.padInner$('div').length;
      createTwoLinesOnTopOfScriptOnOtherUserBrowser(function(){
        // we need to wait for both users have the same amount of lines
        checkIfHasCreatedTwoMoreLinesOnUserBrowser(originalNumberOfLines, done);
      });
    });

    it('updates the comment icon position', function(done){
      helper.waitFor(function(){
        var $commentIcon = helper.padOuter$('#commentIcons #icon-' + firstCommentId);
        var $commentedText = helper.padInner$('.' + firstCommentId);
        var expectedTop = $commentedText.offset().top + 2; // all icons are +2px down to adjust position

        return $commentIcon.offset().top === expectedTop;
      }).done(done)
    });
  })
});
