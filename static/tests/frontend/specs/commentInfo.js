describe('ep_comments_page - show comment info', function() {
  var utils = ep_comments_page_test_helper.utils;
  var apiUtils = ep_comments_page_test_helper.apiUtils;

  // this regex tests the format of something like '12/3/2018, 2:48 PM'
  var DATE_TIME_REGEX = /((0[1-9]|[12]\d|3[01])\/([1-9]|1[0-2])\/[12]\d{3})(, ([0-9]|1[0-2]):[0-9][0-9] (A|P)M)/;
  var COMMENT_LINE = 0;
  var COMMENT_AND_REPLIES_LINE = 1;
  var LENGTH_OF_COMMENT_ON_SECOND_LINE = 2;
  var FIRST_REPLY_TEXT = 'first reply';
  var SECOND_REPLY_TEXT = 'second reply';
  var REPLY_FIELDS = {
    text: '.reply-description-body',
    author: '.author',
    initials: '.initials',
    date: '.reply-date',
  };

  before(function(done) {
    utils.createPadWithCommentAndReplies({}, this, function(){
      setLocaleToAmericanEnglish(); // force to use en-US locale

      // show info dialog
      var commentId = utils.getCommentIdOfLine(COMMENT_AND_REPLIES_LINE);
      apiUtils.simulateCallToShowCommentInfo(commentId);
      done();
    });
    this.timeout(60000);
  });


  it('displays the comment creator initials', function(done) {
    expect(getTextOfDescriptionHeader('initials')).to.be('JO');
    done();
  });

  it('displays the comment creator', function(done) {
    expect(getTextOfDescriptionHeader('author')).to.be('John');
    done();
  });

  it('displays the scene position', function(done) {
    expect(getTextOfDescriptionHeader('scene')).to.be('SCENE 0');
    done();
  });

  it('displays the date that comment was created', function(done) {
    var dateField = helper.padOuter$('.comment-date').text();
    expect(dateField).to.match(DATE_TIME_REGEX);
    done();
  });

  context('when comment does not have replies', function() {
    before(function() {
      var commentId = utils.getCommentIdOfLine(COMMENT_LINE);
      apiUtils.simulateCallToShowCommentInfo(commentId);
    });

    it('does not show replies button', function(done) {
      var $replyButton = helper.padOuter$('.button--show_replies');
      var isReplyButtonVisible = $replyButton.is(':visible');
      expect(isReplyButtonVisible).to.be(false);
      done();
    });
  });

  context('when comment has replies', function() {
    before(function() {
      var commentId = utils.getCommentIdOfLine(COMMENT_AND_REPLIES_LINE);
      apiUtils.simulateCallToShowCommentInfo(commentId);
    });

    it('displays the length of replies', function(done) {
      helper
        .waitFor(function() {
          return helper.padOuter$('#text-mark-info').is(':visible');
        })
        .done(function() {
          var $replyButton = helper.padOuter$('.button--show_replies');
          var hasRepliesButton = $replyButton.is(':visible');
          var displayLengthOfReplies = $replyButton.text();
          var messageOfShowRepliesButton = 'show replies (' + LENGTH_OF_COMMENT_ON_SECOND_LINE + ')';
          expect(hasRepliesButton).to.be(true);
          expect(displayLengthOfReplies).to.be(messageOfShowRepliesButton);
          done();
        });
    });

    context('and user clicks on replies button', function() {
      before(function() {
        utils.clickOnShowReplyButton();
      });

      it('renders the replies', function(done) {
        var repliesContainerIsVisible = utils.getReplyContainer().is(':visible');
        var containerChildrenLength = utils.getReplyContainer().children().length;
        expect(repliesContainerIsVisible).to.be(true);
        expect(utils.getReplyContainer().length).to.be(1);
        expect(containerChildrenLength).to.be(2);
        done();
      });

      it('renders replies content text', function(done) {
        var firstReplyText = getReplyField(0, 'text');
        var secondReplyText = getReplyField(1, 'text');
        expect(firstReplyText).to.be(FIRST_REPLY_TEXT);
        expect(secondReplyText).to.be(SECOND_REPLY_TEXT);
        done();
      });

      it('renders the replies author', function(done) {
        var replyAuthor = getReplyField(0, 'author');
        expect(replyAuthor).to.be('John');
        done();
      });

      it('renders the replies author initials', function(done) {
        var replyAuthorInitials = getReplyField(0, 'initials');
        expect(replyAuthorInitials).to.be('JO');
        done();
      });

      it('renders the replies date', function(done) {
        var replyDate = getReplyField(0, 'date');
        expect(replyDate).to.match(DATE_TIME_REGEX);
        done();
      });

      it('changes the text of the reply button to "hide replies"', function(done) {
        var buttonText = helper.padOuter$('.button--show_replies').text();
        expect(buttonText).to.be('hide replies');
        done();
      });

      context('and user clicks again on reply button', function() {
        before(function() {
          utils.clickOnShowReplyButton();
        });

        it('hides the replies window', function(done) {
          var repliesContainerIsVisible = utils.getReplyContainer().is(':visible');
          expect(repliesContainerIsVisible).to.be(false);
          done();
        });

        it('changes the text of the reply button to "show replies"', function(done) {
          var buttonText = helper.padOuter$('.button--show_replies').text();
          expect(buttonText).to.be('show replies (2)');
          done();
        });
      });
    });
  });

  var setLocaleToAmericanEnglish = function() {
    var thisPlugin = helper.padChrome$.window.pad.plugins.ep_comments_page;
    thisPlugin.commentInfoDialog.userLocale= 'en-US';
  }

  var getReplyField = function(index, field) {
    return utils
      .getReplyContainer()
      .children()
      .eq(index)
      .find(REPLY_FIELDS[field])
      .text()
      .trim();
  };

  var getTextOfDescriptionHeader = function(field) {
    var commentDescriptionHeader = helper.padOuter$('.comment-description-header');
    return commentDescriptionHeader.find('.' + field).text();
  };

});
