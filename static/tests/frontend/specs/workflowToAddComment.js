describe('ep_comments_page - workflow to add comment', function() {
  var utils = ep_comments_page_test_helper.utils;

  before(function(done) {
    utils.createPad(this, done);
    this.timeout(60000);
  });

  it('immediately removes focus from editor text', function(done) {
    utils.pressShortcutToAddCommentToLine(0, function() {
      var elementWithFocus = helper.padOuter$.document.activeElement;
      var iframeWithEditor = helper.padOuter$('iframe').get(0);

      expect(elementWithFocus).not.to.be(iframeWithEditor);

      done();
    });
  });
});
