describe('ep_comments_page - workflow to remove reply', function() {
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

  var clickOnRemoveReply = function(index) {
    return utils
      .getReplyContainer()
      .children()
      .eq(index)
      .find('.reply-button--delete')
      .click();
  };

  context('when user click on "remove" on reply', function() {
    before(function(done) {
      var commentId = utils.getCommentIdOfLine(COMMENT_AND_REPLIES_LINE);
      apiUtils.simulateCallToShowCommentInfo(commentId);
      helper
        .waitFor(function() {
          return utils.isCommentInfoWindowVisible();
        })
        .done(function() {
          utils.clickOnShowReplyButton();
          clickOnRemoveReply(0);
          done();
        });
    });

    it('hides the reply removed', function(done) {
      expect(utils.getReplyContainer().children().length).to.be(1);
      done();
    });

    // as the comment info window get a fresh comment data every time is
    // opened, we close, open again to check if the reply removed is not on the
    // window anymore
    it('removes the reply', function(done) {
      utils.closeCommentWindowAndClickOnShowReplies(COMMENT_AND_REPLIES_LINE, function() {
        expect(utils.getReplyContainer().children().length).to.be(1);
        done();
      })
    });
  });
});
