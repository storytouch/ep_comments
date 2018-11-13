describe('ep_comments_page - api - show comment info', function() {
  var utils = ep_comments_page_test_helper.utils;
  var apiUtils = ep_comments_page_test_helper.apiUtils;
  var COMMENT_LINE = 0;

  before(function(done) {
    utils.createPad(this, function() {
      utils.addCommentToLine(COMMENT_LINE, 'comment text', function() {
        var commentId = utils.getCommentIdOfLine(COMMENT_LINE);
        apiUtils.simulateCallToShowCommentInfo(commentId);
        done();
      });
    });
    this.timeout(60000);
  });

  it('shows the dialog with comment info', function(done) {
    helper
      .waitFor(function() {
        return helper.padOuter$('#text-mark-info').is(':visible');
      })
      .done(done);
  });
});
