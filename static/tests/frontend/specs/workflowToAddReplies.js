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
    beforeEach(function(done) {
      var $textArea = getTextArea();
      $textArea.click(); // toggle field
      var replyText = 'this is a reply!';
      $textArea.sendkeys('{selectall}' + replyText);
      helper
        .waitFor(function() {
          return getTextArea().val() === replyText;
        })
        .done(done);
    });

    context('and user presses cancel', function() {
      beforeEach(function() {
        helper.padOuter$('.add-reply-button--cancel').click();
      });

      it('removes the text added', function(done) {
        helper.waitFor(function() {
          var textAreaText = getTextArea().val();
          return textAreaText === '';
        }).done(done);
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
        var $buttons = $addReplyForm.find('.button-rows')
        var buttonsAreVisible = $buttons.is(':visible');
        expect(buttonsAreVisible).to.be(false);
        done();
      });
    });

    context('and user presses save', function() {
      beforeEach(function() {
        helper.padOuter$('.add-reply-button--save').click();
      });

      xit('cleans the add reply form', function(done) {
        done();
      });

      xit('saves the info on the database', function(done) {
        done();
      });

      xit('show the reply', function(done) {
        done();
      });
    });
  });

  var getTextArea = function() {
    return  helper.padOuter$('.reply-content--input');
  }
});
