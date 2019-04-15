describe('ep_comments_page - api - "data changed" event', function() {
  var utils = ep_comments_page_test_helper.utils;
  var apiUtils = ep_comments_page_test_helper.apiUtils;

  var textOfFirstCreatedComment = 'I was created first';
  var textOfLastCreatedComment = 'I was created later';
  var textOfReply = 'I am a reply';

  var FIRST_LINE = 0;
  var COMMENT_LINE = 1;

  before(function (done) {
    utils.createPad(this, done);
  });

  context('when user creates a comment', function() {
    before(function(done) {
      utils.addCommentToLine(COMMENT_LINE, textOfFirstCreatedComment, done);
    });

    it('sends the data of created comment', function(done) {
      var comments = apiUtils.getLastDataSent();

      expect(comments.length).to.be(1);
      expect(comments[0].text).to.be(textOfFirstCreatedComment);
      expect(comments[0].author).to.not.be(undefined);
      expect(comments[0].commentId).to.not.be(undefined);
      expect(comments[0].name).to.not.be(undefined);
      expect(comments[0].timestamp).to.not.be(undefined);
      expect(comments[0].modelName).to.be('Comment');

      done();
    });

    it('sets the comment creator as the comment author', function(done) {
      var comment = apiUtils.getLastDataSent()[0];
      expect(comment.creator).to.be(comment.author);
      done();
    });

    context('and user reloads the pad', function() {
      before(function(done) {
        // create a reply too
        var commentId = utils.getCommentIdOfLine(COMMENT_LINE);
        apiUtils.simulateCallToCreateReply(commentId, textOfReply);

        apiUtils.resetData();
        utils.reloadPad(this, done);
      });

      after(function() {
        // remove the reply created on before()
        var commentId = utils.getCommentIdOfLine(COMMENT_LINE);
        var replyData = apiUtils.getReplyDataOnPosition(0, commentId);
        apiUtils.simulateCallToDeleteReply(replyData.replyId, commentId);
      });

      it('sends the data of existing comment when pad finishes loading', function(done) {
        apiUtils.waitForDataToBeSent(function() {
          var comments = apiUtils.getLastDataSent();

          expect(comments.length).to.be(1);
          expect(comments[0].text).to.be(textOfFirstCreatedComment);

          done();
        });
      });

      it('sends the data of existing reply when pad finishes loading', function(done) {
        apiUtils.waitForDataToBeSent(function() {
          var comments = apiUtils.getLastDataSent();
          var commentId = utils.getCommentIdOfLine(COMMENT_LINE);
          expect(apiUtils.getNumberOfRepliesOfComment(commentId)).to.be(1);
          expect(apiUtils.getReplyDataOnPosition(0, commentId).text).to.be(textOfReply);

          done();
        });
      });
    });

    context('and user creates another comment before the first one', function() {
      before(function(done) {
        utils.addCommentToLine(0, textOfLastCreatedComment, done);
      });
      after(function() {
        utils.undo();
      });

      it('sends the comments on the order they appear on the pad text', function(done) {
        var comments = apiUtils.getLastDataSent();

        expect(comments.length).to.be(2);
        expect(comments[0].text).to.be(textOfLastCreatedComment);
        expect(comments[1].text).to.be(textOfFirstCreatedComment);

        done();
      });
    });

    // scenario of bugs https://trello.com/c/e0Y19z9j/1189 & https://trello.com/c/e0Y19z9j/1195
    context('and comment has a reply and user creates another comment in the middle of the first one', function() {
      before(function(done) {
        utils.addCommentReplyToLine(COMMENT_LINE, 'reply text', function() {
          // try to add 2nd comment
          var $lineWithOriginalComment = utils.getLine(COMMENT_LINE);
          helper.selectLines($lineWithOriginalComment, $lineWithOriginalComment, 1, 2);
          utils.pressShortcutToAddCommentToSelectedText();
          utils.fillCommentForm('second comment', done);
        });
      });

      after(function() {
        utils.undo(); // comment creation
        utils.undo(); // reply creation
      });

      // https://trello.com/c/e0Y19z9j/1189
      it('does not raise any error', function(done) {
        // wait for line to have a 2nd comment
        helper.waitFor(function() {
          return utils.getCommentIdsOfLine(COMMENT_LINE).length > 1;
        }).done(function() {
          var comments = apiUtils.getLastDataSent();
          expect(comments.length).to.be(2);
          done();
        });
      });

      // https://trello.com/c/e0Y19z9j/1195
      it('shows the comment icon without reply', function(done) {
        var comments = apiUtils.getLastDataSent();
        var idOfSecondComment = comments[1].commentId;
        var $commentIcon = helper.padOuter$('#commentIcons #icon-' + idOfSecondComment);
        expect($commentIcon.hasClass('withReply')).to.be(false);
        done();
      });
    });

    context('and one comment is deleted', function() {
      before(function(done) {
        // create one more comment, to have more comments as a starting point for the test
        utils.addCommentToLine(0, textOfLastCreatedComment, function() {
          var commentId = utils.getCommentIdOfLine(1);
          apiUtils.simulateCallToDeleteComment(commentId);
          done();
        });
      });
      after(function() {
        utils.undo(); // comment delete
        utils.undo(); // comment creation
      });

      it('sends the list of comments without the removed one', function(done) {
        var comments = apiUtils.getLastDataSent();

        expect(comments.length).to.be(1);
        expect(comments[0].text).to.be(textOfLastCreatedComment);

        done();
      });
    });

    context('and pad has scenes', function() {
      var LINE_BEFORE_1ST_SCENE           = 2;
      var LINE_ON_HEADING_OF_1ST_SCENE    = LINE_BEFORE_1ST_SCENE + 3; // SMs + heading
      var LINE_IN_THE_MIDDLE_OF_1ST_SCENE = LINE_ON_HEADING_OF_1ST_SCENE + 1;
      var LINE_ON_HEADING_OF_2ND_SCENE    = LINE_IN_THE_MIDDLE_OF_1ST_SCENE + 3; // SMs + heading
      var LINE_ON_SM_OF_2ND_SCENE         = LINE_ON_HEADING_OF_2ND_SCENE - 1;

      before(function(done) {
        this.timeout(10000);

        var seUtils = ep_script_elements_test_helper.utils;
        var smUtils = ep_script_scene_marks_test_helper.utils;

        // insert some scenes on second line
        var synopsis = smUtils.synopsis();
        var headingOf1stScene = seUtils.heading('heading of 1st scene');
        var lineInTheMiddleOf1stScene = seUtils.general('line on 1st scene');
        var headingOf2ndScene = seUtils.heading('heading of 2nd scene');
        var someScenes = synopsis
                       + headingOf1stScene
                       + lineInTheMiddleOf1stScene
                       + synopsis
                       + headingOf2ndScene;
        utils.getLine(1).html('<br>' + utils.getLine(1).html() + '<br>' + someScenes);

        // wait until all SMs are created
        helper.waitFor(function() {
          // each scene creates 2 synopsis lines (title & summary)
          return helper.padInner$('.withSceneSynopsis').length === 4;
        }).done(function() {
          // show SM that will receive a comment
          smUtils.clickOnSceneMarkButtonOfLine(LINE_ON_HEADING_OF_2ND_SCENE);

          // create comments
          utils.addCommentToLine(LINE_ON_HEADING_OF_1ST_SCENE, 'LINE_ON_HEADING_OF_1ST_SCENE', function() {
            utils.addCommentToLine(LINE_IN_THE_MIDDLE_OF_1ST_SCENE, 'LINE_IN_THE_MIDDLE_OF_1ST_SCENE', function() {
              utils.addCommentToLine(LINE_ON_HEADING_OF_2ND_SCENE, 'LINE_ON_HEADING_OF_2ND_SCENE', function() {
                utils.addCommentToLine(LINE_ON_SM_OF_2ND_SCENE, 'LINE_ON_SM_OF_2ND_SCENE', done);
              });
            });
          });
        });
      });

      it('sends no scene number on comment before 1st scene', function(done) {
        var comment = apiUtils.getLastDataSent()[0];
        expect(comment.scene).to.be(0);
        done();
      });

      it('sends scene 1 on comment on 1st heading', function(done) {
        var comment = apiUtils.getLastDataSent()[1];
        expect(comment.text).to.be('LINE_ON_HEADING_OF_1ST_SCENE');
        expect(comment.scene).to.be(1);
        done();
      });

      it('sends scene 1 on comment on line in the middle of 1st scene', function(done) {
        var comment = apiUtils.getLastDataSent()[2];
        expect(comment.text).to.be('LINE_IN_THE_MIDDLE_OF_1ST_SCENE');
        expect(comment.scene).to.be(1);
        done();
      });

      it('sends scene 2 on comment on a scene mark of 2nd scene', function(done) {
        var comment = apiUtils.getLastDataSent()[3];
        expect(comment.text).to.be('LINE_ON_SM_OF_2ND_SCENE');
        expect(comment.scene).to.be(2);
        done();
      });

      it('sends scene 2 on comment on 2nd heading', function(done) {
        var comment = apiUtils.getLastDataSent()[4];
        expect(comment.text).to.be('LINE_ON_HEADING_OF_2ND_SCENE');
        expect(comment.scene).to.be(2);
        done();
      });

      context('and user creates a new scene before scenes with comments', function() {
        before(function(done) {
          var seUtils = ep_script_elements_test_helper.utils;
          var seApiUtils = ep_script_elements_test_helper.apiUtils;

          var originalNumberOfScenes = helper.padInner$('heading').length;
          apiUtils.resetData();

          // adds a scene before all comments
          utils.placeCaretOnLine(LINE_BEFORE_1ST_SCENE, function() {
            seApiUtils.simulateTriggerOfDropdownChanged(seUtils.HEADING);

            helper.waitFor(function() {
              // wait for scene to be created
              var currentNumberOfScenes = helper.padInner$('heading').length;
              return currentNumberOfScenes === originalNumberOfScenes + 1;
            }).done(done);
          });
        });

        it('updates scene numbers on comments', function(done) {
          apiUtils.waitForDataToBeSent(function() {
            var comments = apiUtils.getLastDataSent();
            expect(comments[0].scene).to.be(1);
            expect(comments[1].scene).to.be(2);
            expect(comments[2].scene).to.be(2);
            expect(comments[3].scene).to.be(3);
            expect(comments[4].scene).to.be(3);
            done();
          });
        });
      });

      context('and user edits a line that is not a heading and has no comment', function() {
        before(function() {
          apiUtils.resetData();
          utils.getLine(0).sendkeys(' - edited - ');
        });

        it('does not send any data change', function(done) {
          helper.waitFor(function() {
            return apiUtils.getLastDataSent();
          })
          .done(function() {
            expect().fail(function() { return 'API data sent' });
          })
          .fail(function() {
            // all set, no API call. We can finish the test
            done();
          });
        });
      });
    });
  });

  // this type of scenario usually it is originated due to a bug. As
  // we have no way to simulate it, we simulate the consequence of it.
  // So, we create the comment classes without having a comment with the
  // commentId saved on the database
  context('when there is a ghost comment', function(){
    var addGhostCommentOnLine = function(line){
      var $targetLine = utils.getLine(line);
      $targetLine.find('span').first().addClass("comment c-notValid1234");
    }

    before(function(done) {
      // we have two comments, a valid and the ghost one
      utils.createPad(this, function(){
        utils.addCommentToLine(COMMENT_LINE, textOfFirstCreatedComment, function(){
          apiUtils.waitForDataToBeSent(function() {
            apiUtils.resetData();
            addGhostCommentOnLine(FIRST_LINE);
            done();
          });
        });
      })
    });

    it('only sends the valid comments via API', function(done){ // valid === any comment that's not a ghost one
      apiUtils.waitForDataToBeSent(function() {
        var comments = apiUtils.getLastDataSent();
        expect(comments.length).to.be(1);
        expect(comments[0].text).to.be(textOfFirstCreatedComment);
        done();
      });
    })
  });
});
