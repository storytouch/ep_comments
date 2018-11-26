describe('ep_comments_page - workflow to edit a comment', function() {
  var utils = ep_comments_page_test_helper.utils;
  var apiUtils = ep_comments_page_test_helper.apiUtils;
  var COMMENT_LINE = 0;
  var ORIGINAL_COMMENT_TEXT = 'comment text';

  var originalCommentData;

  before(function(done) {
    utils.createPad(this, function() {
      utils.addCommentToLine(COMMENT_LINE, ORIGINAL_COMMENT_TEXT, function() {
        apiUtils.waitForDataToBeSent(function() {
          var comments = apiUtils.getLastDataSent();
          originalCommentData = comments[0];
          var commentId = originalCommentData.commentId;
          apiUtils.simulateCallToShowCommentInfo(commentId);
          done();
        });
      });
    });
    this.timeout(60000);
  });

  context('when user clicks on the "edit" button of the dialog', function() {
    before(function() {
      utils.getCommentInfoDialog()
        .find('.button--edit')
        .click();
    });

    it('opens the dialog to edit Comment', function(done) {
      var test = this;
      openCommentEditDialog(test, done);
    });

    it('closes the Comment info dialog', function(done) {
      testIfCommentInfoDialogIsClosed(done);
    });

    context('and user changes the description and saves the change', function() {
      before(function() {
        getCommentEditDialog()
          .find('#comment-description')
          .val('changed!');
        getCommentEditDialog()
          .find('.comment-button--save')
          .click();
      });

      it('closes the dialog to edit Comment', function(done) {
        closeCommentEditDialog(done);
      });

      it('opens the Comment info dialog with the updated description', function(done) {
        utils.testIfCommentDialogIsClosed(function() {
          var newDescription = utils.getCommentInfoDialog()
            .find('.comment-description-body')
            .text();
          expect(newDescription.trim()).to.be('changed!');
          done();
        });
      });

      context('then user clicks on the "close" button of the dialog', function() {
        before(function() {
          utils.getCommentInfoDialog()
            .find('.ui-dialog-titlebar-close')
            .click();
        });

        it('closes the Comment info dialog', function(done) {
          testIfCommentInfoDialogIsClosed(done);
        });
      });
    });
  });

  var epCommentsUtils = ep_comments_page_test_helper.utils;

  // assume dialogs are opened
  var testIfCommentInfoDialogIsClosed = function(done) {
    helper
      .waitFor(function() {
        return !epCommentsUtils.getCommentInfoDialog().is(':visible');
      })
      .done(done);
  };

  var closeCommentEditDialog = function(done) {
    helper
      .waitFor(function() {
        return !getCommentEditDialog().is(':visible');
      })
      .done(done);
  };

  var openCommentEditDialog = function(test, done) {
    test.timeout(4000);
    helper
      .waitFor(function() {
        return getCommentEditDialog().is(':visible');
      }, 4000)
      .done(done);
  };

  var getCommentEditDialog = function() {
    return helper.padOuter$('.ui-dialog--comment:has(#edit-comment)');
  };
});
