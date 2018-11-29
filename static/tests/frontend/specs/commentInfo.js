describe('ep_comments_page - show comment info', function() {
  var utils = ep_comments_page_test_helper.utils;
  var apiUtils = ep_comments_page_test_helper.apiUtils;
  var COMMENT_LINE = 0;
  var COMMENT_AND_REPLIES_LINE = 1;
  var LENGTH_OF_COMMENT_ON_SECOND_LINE = 2;
  var FIRST_REPLY_TEXT = 'first reply';
  var SECOND_REPLY_TEXT = 'second reply';

  before(function(done) {
    utils.createPad(this, function() {
      utils.addCommentToLine(COMMENT_LINE, 'comment text', function() {
        utils.addCommentAndReplyToLine(COMMENT_AND_REPLIES_LINE, 'second comment', FIRST_REPLY_TEXT, function() {
          utils.addCommentReplyToLine(COMMENT_AND_REPLIES_LINE, SECOND_REPLY_TEXT, done);
        });
      });
    });
    this.timeout(60000);
  });

  var getReplyText = function(index) {
    return utils.getReplyContainer()
      .children()
      .eq(index)
      .find('.reply-description')
      .text()
      .trim();
  };

  context('when comment does not have replies', function() {
    before(function() {
      var commentId = utils.getCommentIdOfLine(COMMENT_LINE);
      apiUtils.simulateCallToShowCommentInfo(commentId);
    });

    // TODO: to implement it
    xit('does not show replies button', function(done) {
      done();
    });
  });

  context('when comment has replies', function() {
    before(function() {
      var commentId = utils.getCommentIdOfLine(COMMENT_AND_REPLIES_LINE);
      apiUtils.simulateCallToShowCommentInfo(commentId);
    });

    it('shows the length of replies', function(done) {
      helper
        .waitFor(function() {
          return helper.padOuter$('#text-mark-info').is(':visible');
        })
        .done(function() {
          var $replyButton = helper.padOuter$('.button--show_replies');
          var hasRepliesButton = $replyButton.is(':visible');
          var displayLengthOfReplies = $replyButton.text();
          var messageOfShowRepliesButton = 'show replies ' + LENGTH_OF_COMMENT_ON_SECOND_LINE;
          expect(hasRepliesButton).to.be(true);
          expect(displayLengthOfReplies).to.be(messageOfShowRepliesButton);
          done();
        });
    });

    context('and user clicks on replies button', function() {
      before(function() {
        utils.clickOnShowReplyButton();
      });

      it('renders the replies', function(done) {
        var repliesContainerIsVisible = utils.getReplyContainer().is(':visible');
        var containerChildrenLength = utils.getReplyContainer().children().length;
        expect(repliesContainerIsVisible).to.be(true);
        expect(utils.getReplyContainer().length).to.be(1);
        expect(containerChildrenLength).to.be(2);
        done();
      });

      it('renders replies content', function(done) {
        var firstReplyText = getReplyText(0);
        var secondReplyText = getReplyText(1);
        expect(firstReplyText).to.be(FIRST_REPLY_TEXT);
        expect(secondReplyText).to.be(SECOND_REPLY_TEXT);
        done();
      });

      // TODO: to implement it!
      xit('changes the text of the reply button to "hide replies"');

      context('and user clicks again on reply button', function() {
        before(function() {
          utils.clickOnShowReplyButton();
        });

        it('hides the replies window', function(done) {
          var repliesContainerIsVisible = utils.getReplyContainer().is(':visible');
          expect(repliesContainerIsVisible).to.be(false);
          done();
        });
      });
    });
  });
});
