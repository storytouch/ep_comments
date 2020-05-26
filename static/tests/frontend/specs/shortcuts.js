describe('ep_comments_page - Shortcuts', function() {
  var utils = ep_comments_page_test_helper.utils;

  context('when the pad type is a ScriptDocument', function() {
    before(function(done) {
      utils.createPad(this, done);
      this.timeout(60000);
    });

    it('opens dialog to add comment when user presses Cmd + Ctrl + C', function(done) {
      utils.pressShortcutToAddCommentToLine(0, function() {
        var $saveButton = helper.padOuter$('.comment-button--save').first();
        expect($saveButton.is(':visible')).to.be(true);
        done();
      });
    });

    context('when user submits the form', function() {
      before(function() {
        var $commentForm = helper.padOuter$('#newComment');

        // fill the comment form and submit it
        var $commentField = $commentForm.find('textarea.comment-content');
        $commentField.val('My comment');
        var $submittButton = $commentForm.find('input[type=submit]');
        $submittButton.click();
      });

      it('saves the comment on original selection', function(done) {
        // wait until comment is created
        helper
          .waitFor(function() {
            return helper.padInner$('.comment').length > 0;
          })
          .done(function() {
            var firstLineText = utils.getLine(0).text();
            var $commentedText = helper.padInner$('.comment');
            expect($commentedText.text()).to.be(firstLineText);
            done();
          });
      });

      it('unmarks text', function(done) {
        var markClass = helper.padChrome$.window.pad.preTextMarkers.comment.markAttribName;

        // verify if there is no text marked with pre-comment class
        var $preCommentTextMarked = helper.padInner$('.' + markClass);
        expect($preCommentTextMarked.length).to.be(0);

        done();
      });
    });
  });

  context('when the pad type is a non-ScriptDocument', function() {
    before(function(done) {
      // mock a non-ScriptDocument padj
      var padType = 'ANY_TYPE';

      var epSEUtils = ep_script_elements_test_helper.utils;
      epSEUtils.newPadWithType(function() {
        // line needs to have some text on it
        var $firstLine = helper.padInner$('div').first();
        $firstLine.sendkeys('something');
        helper
          .waitFor(function() {
            var lineNumber = helper.padInner$('div').length;
            return lineNumber === 1;
          })
          .done(done);
      }, padType);
      this.timeout(60000);
    });

    it('does not opens dialog to add comment when user presses Cmd + Ctrl + C', function(done) {
      utils.pressShortcutToAddCommentToLine(0, function() {
        var $saveButton = helper.padOuter$('.comment-button--save').first();
        expect($saveButton.is(':visible')).to.be(false);
        done();
      });
    });
  });
});
