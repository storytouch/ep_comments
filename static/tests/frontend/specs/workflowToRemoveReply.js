describe('ep_comments_page - workflow to remove reply', function() {
  var utils = ep_comments_page_test_helper.utils;
  var apiUtils = ep_comments_page_test_helper.apiUtils;
  var COMMENT_AND_REPLIES_LINE = 1;

  before(function(done) {
    utils.createPadWithCommentAndReplies({}, this, done);
    this.timeout(60000);
  });

  context('when user click on "remove" on reply', function() {
    before(function(done) {
      var commentId = utils.getCommentIdOfLine(COMMENT_AND_REPLIES_LINE);
      apiUtils.simulateCallToShowCommentInfo(commentId);
      helper
        .waitFor(function() {
          return utils.isCommentInfoWindowVisible();
        })
        .done(function() {
          utils.toggleShowHideReplyButton();
          clickOnRemoveReply(0);
          done();
        });
    });

    it('hides the reply removed', function(done) {
      expect(utils.getReplyContainer().children().length).to.be(1);
      done();
    });

    // before removing we had 2 replies
    it('updates the show/hide replies button', function(done) {
      utils.toggleShowHideReplyButton(); // hide the replies
      var $replyButton = helper.padOuter$('.button--show_replies');
      var replyButtonText = $replyButton.text();
      var messageOfShowRepliesButton = 'show replies (1)';
      expect(replyButtonText).to.be(messageOfShowRepliesButton);
      done();
    });

    it('keeps the main window visible', function(done) {
      expect(utils.isCommentInfoWindowVisible()).to.be(true);
      done();
    });

    // as the comment info window get a fresh comment data every time is
    // opened, we close, open again to check if the reply removed is not on the
    // window anymore
    it('removes the reply', function(done) {
      utils.reloadCommentWindowAndClickOnShowReplies(COMMENT_AND_REPLIES_LINE, function() {
        expect(utils.getReplyContainer().children().length).to.be(1);
        done();
      });
    });
  });

  var clickOnRemoveReply = function(index) {
    return utils
      .getReplyContainer()
      .children()
      .eq(index)
      .find('.reply-button--delete')
      .click();
  };
});
