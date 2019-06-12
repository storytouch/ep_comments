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

  context('when user cancels the comment creation', function() {
    before(function(done) {
      // wait for dialog to open and finish animation...
      // (we cannot simply check for utils.getNewCommentDialog().is(':visible')
      // because dialog will be visible before it finishes animation)
      setTimeout(function() {
        // ... then close it
        utils.getNewCommentDialog().find('.ui-dialog-titlebar-close').click();
        done();
      }, 1000);
    });

    it('sends the focus back to the editor text', function(done) {
      var iframeWithEditor = helper.padOuter$('iframe').get(0);
      helper.waitFor(function() {
        var elementWithFocus = helper.padOuter$.document.activeElement;
        return elementWithFocus === iframeWithEditor;
      }).done(done);
    });
  });
});
