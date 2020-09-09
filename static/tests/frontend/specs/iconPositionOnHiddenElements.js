describe('ep_comments_page - icon position on hidden elements', function() {
  var utils = ep_comments_page_test_helper.utils;
  var apiUtils = ep_comments_page_test_helper.apiUtils;

  var EPI_NAME = 0;
  var ACT_NAME = 2;
  var SEQ_NAME = 4;
  var SCE_NAME = 6;
  var HEADING = 8;
  var ACTION = 9;
  var SECOND_ACT_NAME = 12;
  var SECOND_SEQ_SUMMARY = 15;
  var COMMENT_LINES = [EPI_NAME, ACT_NAME, SEQ_NAME, SCE_NAME, HEADING];
  var ICON_POSITION_TOLERANCE = 2; // 2px of tolerance

  var checkVisibilityOfComments = function(lines, checkVisibility) {
    var commentIdsOfLines = getCommentsIdOfTargetElements(lines);
    return _.every(commentIdsOfLines, function (id) {
      var $commentIcon = helper.padOuter$('#commentIcons #icon-' + id);
      return checkVisibility($commentIcon);
    });
  }

  var notVisible = function($target) {
    return !isVisible($target);
  }

  var isVisible = function($target){
    return $target.length && $target[0].getBoundingClientRect().height > 0;
  }

  var isCommentIconsVisible = function(lines) {
    return checkVisibilityOfComments(lines, isVisible);
  }

  var isCommentIconsNotVisible = function(lines) {
    return checkVisibilityOfComments(lines, notVisible);
  }

  var getCommentsIdOfTargetElements = function(lines) {
    var $lines = helper.padInner$('div');
    return _.map(lines, function(line){
      var elementClasses = $lines.eq(line).find('span.comment').attr('class');
      return getCommentId(elementClasses);
    });
  }

  var getCommentId = function(classes) {
    return classes.match(/c-([A-Za-z0-9])*/)[0];
  }

  var createPad = function(test, done) {
    var firstEpisodeText = 'scene 1';
    var lastLineText = 'scene 2';
    var actionText = 'action';
    var smUtils = ep_script_scene_marks_test_helper.utils;
    var script = smUtils.createEpi(firstEpisodeText) + smUtils.action(actionText) + smUtils.createEpi(lastLineText);
    utils.createPad(test, done, script, lastLineText);
  }

  var createCommentsOnLines = function(lines, done) {
    utils.addCommentToLine(lines[0], 'c1', function() {
      utils.addCommentToLine(lines[1], 'c2', function() {
        utils.addCommentToLine(lines[2], 'c3', function() {
          utils.addCommentToLine(lines[3], 'c4', function() {
            utils.addCommentToLine(lines[4], 'c5', done);
          });
        });
      });
    });
  }

  var checkIfHasCommentIconsOnLine = function(linesWhereCommentIsApplied, lineWhereCommentShouldBe, cb) {
    var $lineWhereCommentShouldBe = helper.padInner$('div').eq(lineWhereCommentShouldBe);
    var $lineOfCommentIcon = $lineWhereCommentShouldBe.find('.sceneMark--title > span, heading > span').first();
    var expectedTop = $lineOfCommentIcon.offset().top;

    // check if icon exists
    expect($commentIcon.length === 1);

    helper.waitFor(function() {
      return _.every(linesWhereCommentIsApplied, function(lineWhereCommentIsApplied){
        var commentId = utils.getCommentIdOfLine(lineWhereCommentIsApplied);
        var $commentIcon = helper.padOuter$('#commentIcons #icon-' + commentId);
        var currentTop = $commentIcon.offset().top;
        return isIconPositionWithinTolerance(expectedTop, currentTop);
      });
    }, 4000).done(cb)
  }

  var isIconPositionWithinTolerance = function(expectedValue, currentValue) {
    return Math.abs(currentValue - expectedValue) <= ICON_POSITION_TOLERANCE;
  }

  before(function(done) {
    createPad(this, function(){
      ep_scene_navigator_test_helper.utils.enableAllEASCButtons();
      createCommentsOnLines(COMMENT_LINES, done);
    });
    this.timeout(60000);
  });

  context('when has a comment on a script element', function() {
    context('and SCRIPT is disable', function() {
      before(function () {
        ep_script_toggle_view_test_helper.utils.setEascMode(['scene']);
      });

      it('does not show its comment icon', function (done) {
        helper.waitFor(function() {
          var targetCommentsIsVisible = isCommentIconsVisible([HEADING]);
          return targetCommentsIsVisible === false;
        }).done(done);
      });

      context('and user enables SCRIPT', function() {
        before(function () {
          ep_script_toggle_view_test_helper.utils.setEascMode(['script']);
        });

        it('shows its comment icon', function (done) {
          helper.waitFor(function() {
            var targetCommentsIsVisible = isCommentIconsVisible([HEADING]);
            return targetCommentsIsVisible === true;
          }).done(done);
        });
      });
    });
  });

  context('when user hides all elements', function() {
    before(function () {
      ep_script_toggle_view_test_helper.utils.setEascMode(['']);
    });

    it('does not show any comment icon', function (done) {
      helper.waitFor(function() {
        var targetCommentsIsNotVisible = isCommentIconsNotVisible(COMMENT_LINES);
        return targetCommentsIsNotVisible === true;
      }).done(done);
    });
  });

  context('when has comment on a hidden scene mark', function() {
    context('and next visible element is a heading', function() {
      before(function(done) {
        ep_script_toggle_view_test_helper.utils.setEascModeAndWaitOneSecond(['script'], done);
      });

      it('shows the SM comment icons on the heading', function (done) {
        checkIfHasCommentIconsOnLine(COMMENT_LINES, HEADING, done);
      });
    });

    context('and next visible element is a scene mark', function() {
      before(function () {
        ep_script_toggle_view_test_helper.utils.setEascMode(['script', 'act']);
      });

      it('shows the SM comment icons on the scene mark', function (done) {
        // send the comment of episode to the act_name line (two comment icons)
        var commentLines = [EPI_NAME, ACT_NAME];
        checkIfHasCommentIconsOnLine(commentLines, ACT_NAME, done);
      });
    });
  });

  context('when comment wraps more than one line', function(){
    context('and comment begins in a SE and ends in a SM', function(){
      before(function (done) {
        utils.addCommentToLines([ACTION, SECOND_SEQ_SUMMARY], 'multi line', function(){
          ep_script_toggle_view_test_helper.utils.setEascMode(['act', 'sequence']);
          done();
        });
        this.timeout(6000);
      });

      context('and the SE is not visible', function(){
        context('and SM is visible', function(){
          it('shows the icon on the first SM visible', function (done) {
            var commentLines = [ACTION];
            checkIfHasCommentIconsOnLine(commentLines, SECOND_ACT_NAME, done);
          });
        })

        context('and SM is not visible', function(){
          before(function() {
            ep_script_toggle_view_test_helper.utils.setEascMode(['scene']);
          });

          it('does not show the icon', function (done) {
            helper.waitFor(function() {
              var targetCommentsIsNotVisible = isCommentIconsNotVisible(ACTION);
              return targetCommentsIsNotVisible === true;
            }).done(done);
          });
        });
      });
    })
  });
});
