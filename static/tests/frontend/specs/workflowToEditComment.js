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
      getCommentInfoDialog()
        .find('.button--edit')
        .click();
    });

    it('opens the dialog to edit Comment', function(done) {
      var test = this;
      openCommentEditDialog(test, done);
    });

    it('closes the Comment info dialog', function(done) {
      closeCommentInfoDialog(done);
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
        openCommentInfoDialog(function() {
          var newDescription = getCommentInfoDialog()
            .find('.comment-description-body')
            .text();
          expect(newDescription.trim()).to.be('changed!');
          done();
        });
      });

      context('then user clicks on the "close" button of the dialog', function() {
        before(function() {
          getCommentInfoDialog()
            .find('.ui-dialog-titlebar-close')
            .click();
        });

        it('closes the Comment info dialog', function(done) {
          closeCommentInfoDialog(done);
        });
      });
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
  var closeCommentEditDialog = function(done) {
    helper
      .waitFor(function() {
        return !getCommentEditDialog().is(':visible');
      })
      .done(done);
  };

  // assume dialogs are closed
  var openCommentInfoDialog = function(done) {
    helper
      .waitFor(function() {
        return getCommentInfoDialog().is(':visible');
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

  var getCommentInfoDialog = function() {
    return helper.padOuter$('.ui-dialog--comment:has(#text-mark-info)');
  };

  var getCommentEditDialog = function() {
    return helper.padOuter$('.ui-dialog--comment:has(#edit-comment)');
  };
});
