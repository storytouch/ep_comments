describe('ep_comments_page - workflow to remove a comment', function() {
  var utils = ep_comments_page_test_helper.utils;
  var apiUtils = ep_comments_page_test_helper.apiUtils;
  var COMMENT_LINE = 0;
  var ORIGINAL_COMMENT_TEXT = 'comment text';

  var originalCommentData, commentId;

  before(function(done) {
    utils.createPad(this, function() {
      utils.addCommentToLine(COMMENT_LINE, ORIGINAL_COMMENT_TEXT, function() {
        apiUtils.waitForDataToBeSent(function() {
          var comments = apiUtils.getLastDataSent();
          originalCommentData = comments[0];
          commentId = originalCommentData.commentId;
          apiUtils.simulateCallToShowCommentInfo(commentId);
          done();
        });
      });
    });
    this.timeout(60000);
  });

  context('when user clicks on the "delete" button of the dialog', function() {
    before(function() {
      getCommentInfoDialog()
        .find('.button--delete')
        .click();
    });

    it('removes the comment from text', function(done) {
      var commentWasRemoved = helper.padInner$('.' + commentId).length === 0;
      expect(commentWasRemoved).to.be(true);
      done();
    });

    it('closes the Comment info dialog', function(done) {
      closeCommentInfoDialog(done);
    });
  });

  // assume dialogs are opened
  var closeCommentInfoDialog = function(done) {
    helper
      .waitFor(function() {
        return !getCommentInfoDialog().is(':visible');
      })
      .done(done);
  };

  var getCommentInfoDialog = function() {
    return helper.padOuter$('.ui-dialog--comment:has(#text-mark-info)');
  };
});
