describe('ep_comments_page - workflow to edit reply', function() {
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

  var clickOnEditReply = function(index) {
    return utils
      .getReplyContainer()
      .children()
      .eq(index)
      .find('.reply-button--edit')
      .click();
  };


  var addTextToReplyEditFieldAndPressSave = function(replyIndex, newReplyText) {
    var $replyInfo = helper
      .padOuter$('#replies-container')
      .children()
      .eq(replyIndex);
    $replyInfo.find('#reply-description').text(newReplyText);
    $replyInfo.find('.reply-button--save').click();
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
      .find('.reply-description')
      .is(':visible');
  };

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
          utils.clickOnShowReplyButton();
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
      var newReplyText = 'new reply text';
      context('and it is an empty text', function() {
        xit('does not save the reply text');
      });

      context('and user saves the change', function() {
        before(function() {
          addTextToReplyEditFieldAndPressSave(replyIndex, newReplyText);
        });

        it('hides the reply edit dialogue', function(done) {
          expect(isReplyEditFormVisible(replyIndex)).to.be(false);
          done();
        });

        it('display the reply info dialogue', function(done) {
          expect(isReplyInfoFormVisible(replyIndex)).to.be(true);
          done();
        });

        it('displays the reply info dialogue with the new text', function(done){
          var replyInfoText = getReplyInfoDialogue(replyIndex).find('.reply-description-body').text();
          expect(replyInfoText).to.be(newReplyText);
          done();
        })

        // every time we open the comment info we get a fresh comment data. So
        // to make sure the reply was saved, we close the dialogue and open it
        // again
        it('saves the new text as the reply text', function(done) {
          utils.closeCommentWindowAndClickOnShowReplies(COMMENT_AND_REPLIES_LINE, function() {
            var replyInfoText = getReplyInfoDialogue(replyIndex).find('.reply-description-body').text();
            expect(replyInfoText).to.be(newReplyText);
            done();
          })
        });
      });

      context('and user cancels the change', function() {
        xit('closes the edit dialog', function(done) {});
        xit('displays the info dialog', function(done) {});
      });
    });
  });
});
