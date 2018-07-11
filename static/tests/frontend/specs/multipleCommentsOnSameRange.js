describe('ep_comments_page - allow add comments on a same range of text', function() {
  var utils = ep_comments_page_test_helper.utils;
  var apiUtils = ep_comments_page_test_helper.apiUtils;

  var firstCommentId, secondCommentId;

  var FIRST_COMMENT_LINE = 0;
  var SECOND_COMMENT_LINE = 1;
  var NUMBER_OF_COMMENTS = 2;
  var FIRST_COMMENT_TEXT = 'first comment';
  var SECOND_COMMENT_TEXT = 'second comment';

  before(function (done) {
    utils.createPad(this, done);
  });

  var helpersOfCommentsOnSameRange = {
    getCommentClasses: function (className) {
      var regex = new RegExp('(c-[A-Za-z0-9]*)', 'g');
      var ids = (className || '').match(regex) || [];
      return ids;
    },

    getCommentIds: function() {
      firstCommentId = utils.getCommentIdOfLine(FIRST_COMMENT_LINE);
      secondCommentId = utils.getCommentIdOfLine(SECOND_COMMENT_LINE);
    },

    createTwoCommentsThatOverlaps: function (cb) {
      utils.addCommentToLine(FIRST_COMMENT_LINE, FIRST_COMMENT_TEXT, function() {
        // give an extra time to create the second comment
        setTimeout(function() {
          utils.addCommentToLines([FIRST_COMMENT_LINE, SECOND_COMMENT_LINE], SECOND_COMMENT_TEXT, cb);
        }, 800);
      });
    },
  }

  var testIfItHasNumberOfCommentsOnLine = function (line, numberOfComments) {
    it('keeps all the comments added', function (done) {
      var classNames = utils.getLine(line).children()[0].classList.value;
      var commentIds = helpersOfCommentsOnSameRange.getCommentClasses(classNames);
      expect(commentIds.length).to.be(numberOfComments);
      done();
    });
  }

  context('when user adds more than one comment on the same range', function() {
    before(function (done) {
      // we create a comment so we create a second one that wraps the first one
      helpersOfCommentsOnSameRange.createTwoCommentsThatOverlaps(function() {
        helpersOfCommentsOnSameRange.getCommentIds();
        done();
      });
      this.timeout(10000);
    });

    testIfItHasNumberOfCommentsOnLine(FIRST_COMMENT_LINE, NUMBER_OF_COMMENTS);

    it('shows the icons of the comments', function (done) {
      var iconCount = helper.padOuter$('.comment-icon').length;
      expect(iconCount).to.be(2);
      done();
    });

    it('sends the data of the comment created via API', function (done) {
      var comments = apiUtils.getLastDataSent();
      var commentsText = comments.map(function(comment) { return comment.text });
      expect(comments.length).to.be(2);
      expect(commentsText).to.contain(FIRST_COMMENT_TEXT);
      expect(commentsText).to.contain(SECOND_COMMENT_TEXT);
      done();
    });

    context('when user edits a text with a comment applied', function() {
      before(function (done) {
        var $firstLine = utils.getLine(FIRST_COMMENT_LINE);
        $firstLine.sendkeys('{selectall}{rightarrow}{backspace}')
        helper.waitFor(function() {
          var $firstLine = utils.getLine(FIRST_COMMENT_LINE);
          var firstLineText = $firstLine.text();
          return firstLineText === 'somethin'; // remove the last char of the 1st line
        }).done(done);
      });

      after(function () {
        utils.undo();
      });

      testIfItHasNumberOfCommentsOnLine(FIRST_COMMENT_LINE, NUMBER_OF_COMMENTS);
    });
  });
});
