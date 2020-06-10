describe('ep_comments_page - Line change scheduler', function() {
  var utils = ep_comments_page_test_helper.utils;

  var FIRST_LINE = 0;
  var LAST_LINE = 9;

  // the timeouts defined in this test are based on this value
  var TIME_TO_UPDATE_ICON_POSITION = 3000;

  var firstCommentId;

  var createScript = function(test, cb) {
    var smUtils = ep_script_scene_marks_test_helper.utils;
    var generalText = 'general';
    var lastLineText = 'last line';
    var script = smUtils.general(generalText).repeat(9) + smUtils.general(lastLineText);
    utils.createPad(test, cb, script, lastLineText);
  }

  var getCommentIds = function() {
    firstCommentId = utils.getCommentIdOfLine(FIRST_LINE);
  }

  before(function(done) {
    this.timeout(60000);
    createScript(this, function(){
      utils.setTimeoutOfLineChangeScheduler(TIME_TO_UPDATE_ICON_POSITION);
      done();
    });
  });

  context('when the user creates a comment in the first and in the last lines', function() {
    before(function(done) {
      this.timeout(10000);
      utils.addCommentToLine(FIRST_LINE, 'comment', function() {
        utils.addCommentToLine(LAST_LINE, 'comment', function() {
          getCommentIds();
          done();
        });
      });
    });

    it('adds a comment icon on the same height of commented text', function(done) {
      firstCommentId = utils.getCommentIdOfLine(FIRST_LINE);
      var $commentIcon = helper.padOuter$('#commentIcons #icon-' + firstCommentId);

      // check icon exists
      expect($commentIcon.length).to.be(1);

      // check height is the same
      var $commentedText = helper.padInner$('.' + firstCommentId);
      var expectedTop = $commentedText.offset().top + 2; // all icons are +2px down to adjust position
      expect($commentIcon.offset().top).to.be(expectedTop);

      done();
    });

    context('and the user udpates the first and the last lines consecutively', function() {
      before(function(done) {
        this.timeout(4000);
        var $firstLine = utils.getLine(FIRST_LINE);
        var $lastLine = utils.getLine(LAST_LINE);

        // create a empty line above the first line;
        // this should udpate the icon position of all lines
        $firstLine.sendkeys('{selectall}{leftarrow}{enter}');

        // wait for the empty line to be created
        setTimeout(function() {
          // editing the last line should not cancel the update of first line
          $lastLine.sendkeys('edited');
          done();
        }, 1000);
      });

      it('does not cancel the update of icon position in the first line', function(done) {
        var timeout = TIME_TO_UPDATE_ICON_POSITION + 1000;
        this.timeout(timeout);
        var $commentedText = helper.padInner$('.' + firstCommentId);
        var expectedTop = $commentedText.offset().top + 2; // all icons are +2px down to adjust position

        helper.waitFor(function() {
          var $commentIcon = helper.padOuter$('#commentIcons #icon-' + firstCommentId);
          var iconOffset = $commentIcon.offset().top;

          return iconOffset === expectedTop;
        }, timeout).done(done);
      });
    });
  });
});
