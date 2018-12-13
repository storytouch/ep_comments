describe('ep_comments_page - workflow to edit reply', function() {
  var utils = ep_comments_page_test_helper.utils;
  var apiUtils = ep_comments_page_test_helper.apiUtils;
  var COMMENT_AND_REPLIES_LINE = 1;
  var FIRST_REPLY_TEXT = 'first reply';

  before(function(done) {
    utils.createPadWithCommentAndReplies({}, this, done);
    this.timeout(60000);
  });

  context('when user click on "edit" on reply', function() {
    var replyIndex = 0;
    before(function(done) {
      var commentId = utils.getCommentIdOfLine(COMMENT_AND_REPLIES_LINE);
      apiUtils.simulateCallToShowCommentInfo(commentId);
      helper
        .waitFor(function() {
          return utils.isCommentInfoWindowVisible();
        })
        .done(function() {
          utils.toggleShowHideReplyButton();
          clickOnEditReply(replyIndex);
          done();
        });
    });

    it('hides the info dialog', function(done) {
      expect(isReplyInfoFormVisible(replyIndex)).to.be(false);
      done();
    });

    it('displays the dialog to edit the reply', function(done) {
      expect(isReplyEditFormVisible(replyIndex)).to.be(true);
      done();
    });

    it('displays the reply original text as default', function(done) {
      var $replyInfo = helper
        .padOuter$('#replies-container')
        .children()
        .eq(replyIndex);
      var replyEditFormText = $replyInfo.find('#reply-description').text();
      expect(replyEditFormText).to.be(FIRST_REPLY_TEXT);
      done();
    });

    context('and user changes the text', function() {
      beforeEach(function(done) {
        utils.reloadCommentWindowAndClickOnShowReplies(COMMENT_AND_REPLIES_LINE, function() {
          clickOnEditReply(replyIndex);
          done();
        });
      });

      context('and user saves the edition', function() {
        var newReplyText = ''; // empty text
        beforeEach(function() {
          addTextToReplyEditFieldAndPressSave(replyIndex, newReplyText);
        });

        context('and it is an empty text', function() {
          it('keeps the edit dialogue opened', function(done) {
            expect(isReplyEditFormVisible(replyIndex)).to.be(true);
            done();
          });

          it('does not save the reply text', function(done) {
            expect(getReplyInfoText(replyIndex)).to.be(FIRST_REPLY_TEXT);
            done();
          });
        });

        context('and the text is not empty', function() {
          before(function() {
            newReplyText = 'new reply text';
          });

          it('hides the reply edit dialogue', function(done) {
            expect(isReplyEditFormVisible(replyIndex)).to.be(false);
            done();
          });

          it('display the reply info dialogue', function(done) {
            expect(isReplyInfoFormVisible(replyIndex)).to.be(true);
            done();
          });

          it('displays the reply info dialogue with the new text', function(done) {
            expect(getReplyInfoText(replyIndex)).to.be(newReplyText);
            done();
          });

          // every time we open the comment info we get a fresh comment data. So
          // to make sure the reply was saved, we close the dialogue and open it
          // again
          it('saves the new text as the reply text', function(done) {
            utils.reloadCommentWindowAndClickOnShowReplies(COMMENT_AND_REPLIES_LINE, function() {
              expect(getReplyInfoText(replyIndex)).to.be(newReplyText);
              done();
            });
          });
        });
      });

      context('and user cancels the edition', function() {
        beforeEach(function() {
          addTextToReplyEditFieldAndPressCancel(replyIndex, '');
        });

        it('closes the edit dialog', function(done) {
          expect(isReplyEditFormVisible(replyIndex)).to.be(false);
          done();
        });

        it('displays the info dialog', function(done) {
          expect(isReplyInfoFormVisible(replyIndex)).to.be(true);
          done();
        });
      });
    });
  });

  var clickOnEditReply = function(index) {
    return utils
      .getReplyContainer()
      .children()
      .eq(index)
      .find('.reply-button--edit')
      .click();
  };

  var addTextToReplyEditFieldAndPressButton = function(replyIndex, newReplyText, action) {
    var $replyInfo = helper
      .padOuter$('#replies-container')
      .children()
      .eq(replyIndex);
    $replyInfo.find('#reply-description').text(newReplyText);
    $replyInfo.find('.reply-button--' + action).click(); // action can be 'save' or 'cancel'
  };

  var addTextToReplyEditFieldAndPressCancel = function(replyIndex, newReplyText) {
    addTextToReplyEditFieldAndPressButton(replyIndex, newReplyText, 'cancel');
  };

  var addTextToReplyEditFieldAndPressSave = function(replyIndex, newReplyText) {
    addTextToReplyEditFieldAndPressButton(replyIndex, newReplyText, 'save');
  };

  var isReplyEditFormVisible = function(replyIndex) {
    var $replyInfo = helper
      .padOuter$('#replies-container')
      .children()
      .eq(replyIndex);
    return $replyInfo.find('.for-reply').is(':visible');
  };

  var getReplyInfoDialogue = function(replyIndex) {
    return helper
      .padOuter$('#replies-container')
      .children()
      .eq(replyIndex);
  };

  var isReplyInfoFormVisible = function(replyIndex) {
    return getReplyInfoDialogue(replyIndex)
      .find('.comment-reply-body')
      .is(':visible');
  };

  var getReplyInfoText = function(replyIndex) {
    return getReplyInfoDialogue(replyIndex)
      .find('.comment-reply-body')
      .text();
  };

});
