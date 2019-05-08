describe('ep_comments_page - api - show add comment dialog', function() {
  var utils = ep_comments_page_test_helper.utils;
  var apiUtils = ep_comments_page_test_helper.apiUtils;

  before(function(done) {
    utils.createPad(this, done);
    this.timeout(60000);
  });

  var closeAddCommentDialog = function(done) {
    utils.closeModal('#newComment', done);
  }

  var waitUntilShowAddCommentDialog = function(success, fail) {
    helper.waitFor(function() {
      return helper.padOuter$('.ui-dialog--comment').is(':visible');
    })
      .done(success)
      .fail(fail);
  }

  var errorCallback = function() {
    expect().fail(function() { return 'It should not show the add comment dialog' });
  }

  var testIfShowAddCommentDialog = function() {
    it('shows the add comment dialog', function(done) {
      waitUntilShowAddCommentDialog(done, errorCallback);
    })
  }

  context('when there is text selected', function() {
    before(function() {
      var $firstLine = helper.padInner$('div').first();
      helper.selectLines($firstLine, $firstLine);
      setTimeout(function() {
        apiUtils.simulateCallToShowAddCommentDialog();
      }, 300);
    });

    after(closeAddCommentDialog);

    testIfShowAddCommentDialog();
  })

  context('when there is not text selected', function() {
    var $firstLine;
    before(function(done) {
      $firstLine = helper.padInner$('div').first();
      $firstLine.sendkeys('{selectall}{leftarrow}'); // remove any previous selection
      setTimeout(function() {
        apiUtils.simulateCallToShowAddCommentDialog();
        done();
      }, 300);
    });

    after(closeAddCommentDialog);

    it('selects the line where the caret is', function(done) {
      var epDnDUtils = ep_draganddrop_test_helper.utils;
      var textSelected  = epDnDUtils.getSelectedText();
      expect(textSelected).to.be($firstLine.text());
      done();
    })

    testIfShowAddCommentDialog();

    context('and target line is empty', function() {
      before(function(done) {
        // ensure the add comment dialog is not opened
        closeAddCommentDialog(function() {
          // remove text from line
          var $firstLine = helper.padInner$('div').first();
          $firstLine.sendkeys('{selectall}{del}')

          setTimeout(function() {
            apiUtils.simulateCallToShowAddCommentDialog();
            done();
          }, 300);
        })
        this.timeout(5000);
      });

      it('does not show the add comment dialog', function(done) {
        // if the dialog does not show we call the successCallback
        var successCallback = function(){ done() }
        waitUntilShowAddCommentDialog(errorCallback, successCallback);
      })
    })
  })
})
