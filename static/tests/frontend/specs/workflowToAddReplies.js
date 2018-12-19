describe('ep_comments_page - workflow to add reply', function() {
  var utils = ep_comments_page_test_helper.utils;
  var apiUtils = ep_comments_page_test_helper.apiUtils;
  var COMMENT_AND_REPLIES_LINE = 1;
  var COMMENT_LINE = 0;

  before(function(done) {
    utils.createPadWithCommentAndReplies({}, this, function() {
      var commentId = utils.getCommentIdOfLine(COMMENT_LINE);
      apiUtils.simulateCallToShowCommentInfo(commentId);
      done();
    });
    this.timeout(60000);
  });

  it('shows the answer reply field', function(done) {
    var addRepliesTextAreaIsVisible = helper.padOuter$('.reply-content--input').is(':visible');
    expect(addRepliesTextAreaIsVisible).to.be(true);
    done();
  });

  context('when user adds a text on add reply field', function() {
    var replyText = 'this is a reply!';

    context('and user presses cancel', function() {
      before(function(done) {
        addTextToAddReplyField(replyText, function() {
          clickOnCancelReplyButton();
          done();
        });
      });

      it('removes the text added', function(done) {
        helper
          .waitFor(function() {
            var textAreaText = getTextArea().val();
            return textAreaText === '';
          })
          .done(done);
      });

      // here we only ensure the form has the class that makes it smaller
      it('collapses the textarea ', function(done) {
        var $addReplyForm = helper.padOuter$('.new-reply');
        var formIsCollapsed = $addReplyForm.hasClass('new-reply--collapsed');
        expect(formIsCollapsed).to.be(true);
        done();
      });

      it('hides the form buttons', function(done) {
        var $addReplyForm = helper.padOuter$('.new-reply');
        var $buttons = $addReplyForm.find('.button-rows');
        var buttonsAreVisible = $buttons.is(':visible');
        expect(buttonsAreVisible).to.be(false);
        done();
      });
    });

    context('and user presses save', function() {
      before(function(done) {
        addTextToAddReplyField(replyText, function() {
          clickOnSaveReplyButton();

          // wait to save reply
          helper
            .waitFor(function() {
              var repliesLength = helper.padOuter$('#replies-container').children();
              return repliesLength;
            })
            .done(done);
        });
      });

      context('and comment has no replies', function() {
        it('adds the button hide replies', function(done) {
          var $replyButton = helper.padOuter$('.button--show_replies');
          var hasRepliesButton = $replyButton.is(':visible');
          var displayLengthOfReplies = $replyButton.text();
          var messageOfShowRepliesButton = 'hide replies';
          expect(hasRepliesButton).to.be(true);
          expect(displayLengthOfReplies).to.be(messageOfShowRepliesButton);
          done();
        });

        it('saves the reply', function(done) {
          var newReplyText = helper.padOuter$('.reply-description-body').text();
          expect(newReplyText).to.be(replyText);
          done();
        });

        it('shows the reply', function(done) {
          var $newReply = helper.padOuter$('.reply-description-body');
          var isNewReplyVisible = $newReply.is(':visible');
          expect(isNewReplyVisible).to.be(true);
          done();
        });
      });

      context('and comment already has replies', function() {
        context('and reply window is visible', function() {
          xit('adds reply at the end of window', function(done) {});
        });

        context('and reply window is not visible', function() {
          xit('updates the button length', function(done) {});
        });
      });
    });
  });

  var getTextArea = function() {
    return helper.padOuter$('.reply-content--input');
  };

  var clickOnSaveReplyButton = function() {
    helper.padOuter$('.add-reply-button--save').click();
  };

  var clickOnCancelReplyButton = function() {
    helper.padOuter$('.add-reply-button--cancel').click();
  };

  var addTextToAddReplyField = function(text, cb) {
    var $textArea = getTextArea();
    $textArea.click(); // toggle field
    $textArea.sendkeys('{selectall}' + text); // add text
    helper
      .waitFor(function() {
        return getTextArea().val() === text; // wait to save value
      })
      .done(cb);
  };
});
