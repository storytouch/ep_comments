var ep_comments_page_test_helper = ep_comments_page_test_helper || {};
ep_comments_page_test_helper.utils = {
  padId: undefined,

  undo: function() { ep_script_elements_test_helper.utils.undo() },
  redo: function() { ep_script_elements_test_helper.utils.redo() },

  _loadPad: function(test, done) {
    var self = this;

    test.timeout(60000);

    this.padId = helper.newPad(function() {
      ep_comments_page_test_helper.apiUtils.startListeningToApiEvents();
      self._enlargeScreen();
      self._chooseToShowComments();

      // use a shorter timeout, so tests don't take too long to build icons
      self.speedUpIconCreation();

      // wait for all helper libs to be loaded
      helper.waitFor(function() {
        return helper.padOuter$.window.scrollIntoView;
      }).done(done);
    }, this.padId);
  },

  speedUpIconCreation: function() {
    var thisPlugin = helper.padChrome$.window.pad.plugins.ep_comments_page;
    thisPlugin.lineChangeEventTriggerer.padChangedListener.timeout = 0;
    thisPlugin.commentIcons.timeToUpdateIconPosition = 0;
  },

  createPad: function(test, done, scriptContent, lastLineText) {
    var self = this;
    this.padId = undefined;

    self._loadPad(test, function() {
      self._createOrResetPadText(done, scriptContent, lastLineText);
    });
  },

  reloadPad: function(test, done) {
    var self = this;
    setTimeout(function() {
      self._loadPad(test, done);
    }, 1000);
  },

  createPadWithCommentAndReplies: function(props, test, cb) {
    // as we use the same config for more than one test, we provide a default setting
    var commentLine = props.commentLine || 0;
    var firstCommentText = props.firstCommentText || 'comment text';
    var secondCommentText = props.secondCommentText || 'second comment';
    var commentAndRepliesLine = props.commentAndRepliesLine || 1;
    var firstReplyText = props.firstReplyText || 'first reply';
    var secondReplyText = props.secondReplyText || 'second reply';

    var self = this;
    self.createPad(test, function() {
      self.addCommentToLine(commentLine, firstCommentText, function() {
        self.addCommentAndReplyToLine(commentAndRepliesLine, secondCommentText, firstReplyText, function() {
          self.addCommentReplyToLine(commentAndRepliesLine, secondReplyText, function() {
            cb();
          });
        });
      });
    });
  },

  _createOrResetPadText: function(done, scriptContent, lastLineText) {
    var self = this;
    var smUtils = ep_script_scene_marks_test_helper.utils;
    self._cleanPad(function() {
      if (!scriptContent) {
        lastLineText = 'anything';
        scriptContent = smUtils.general('something') + smUtils.general(lastLineText);
      }
      smUtils.createScriptWith(scriptContent, lastLineText, done);
    });
  },

  _cleanPad: function(done) {
    var inner$ = helper.padInner$;
    var $padContent = inner$('#innerdocbody');
    $padContent.html('');

    // wait for Etherpad to re-create first line
    helper.waitFor(function() {
      var lineNumber = inner$('div').length;
      return lineNumber === 1;
    }, 2000).done(done);
  },

  _enlargeScreen: function() {
    $('#iframe-container iframe').css('max-width', '3000px');
  },
  resetScreenSize: function() {
    $('#iframe-container iframe').css('max-width', '');
  },

  cleanText: function(text) {
    return text.replace(/\s/gi, ' ');
  },

  _chooseToShowComments: function() {
    var chrome$ = helper.padChrome$;

    // click on the settings button to make settings visible
    var $settingsButton = chrome$('.buttonicon-settings');
    $settingsButton.click();

    // check 'Show Comments'
    var $showComments = chrome$('#options-comments')
    if (!$showComments.is(':checked')) $showComments.click();

    // hide settings again
    $settingsButton.click();
  },

  clickOnCommentIcon: function(commentId) {
    var $commentIcon = helper.padOuter$('#commentIcons #icon-' + commentId).first();
    $commentIcon.click();
  },

  addCommentToLine: function(line, textOfComment, done) {
    this.addCommentToLines([line, line], textOfComment, done);
  },

  addCommentAndReplyToLine: function(lines, textOfComment, textOfReply, done) {
    var self = this;
    this.addCommentToLine(lines, textOfComment, function() {
      self.addCommentReplyToLine(lines, textOfReply, done);
    });
  },

  addCommentToLines: function(lines, textOfComment, done) {
    var self = this;

    self.pressShortcutToAddCommentToLines(lines, function() {
      self.fillCommentForm(textOfComment, function() {
        // wait until comment is created and comment id is set
        self.waitForCommentToBeCreatedOnLines(lines, done);
      });
    });
  },

  fillCommentForm: function(textOfComment, done) {
    // wait for form to be displayed
    var $commentForm = helper.padOuter$('#newComment');
    helper.waitFor(function() {
      return $commentForm.is(':visible');
    }).done(function() {
      // fill the comment form and submit it
      var $commentField = $commentForm.find('textarea.comment-content');
      $commentField.val(textOfComment);
      var $submittButton = $commentForm.find('input[type=submit]');
      $submittButton.click();
      done();
    });
  },

  addCommentReplyToLine: function(line, textOfReply, done) {
    var apiUtils = ep_comments_page_test_helper.apiUtils;

    var commentId = this.getCommentIdOfLine(line);
    var originalNumberOfRepliesOfComment = apiUtils.getNumberOfRepliesOfComment(commentId);
    apiUtils.simulateCallToCreateReply(commentId, textOfReply);

    // wait for the reply to be saved
    helper.waitFor(function() {
      var newNumberOfRepliesOfComment = apiUtils.getNumberOfRepliesOfComment(commentId);
      var replyWasCreated = newNumberOfRepliesOfComment === originalNumberOfRepliesOfComment + 1;
      return replyWasCreated;
    }).done(done);
  },

  getLine: function(lineNum) {
    return helper.padInner$('div:eq(' + lineNum + ')');
  },

  getBackgroundColorOf: function(commentId) {
    var $commentedText = helper.padInner$('.' + commentId);
    var style = helper.padInner$.window.getComputedStyle($commentedText.get(0), '');
    return style.getPropertyValue('background-color');
  },

  // use ep_copy... to handle copy/cut/paste events
  copySelection: function() {
    ep_script_copy_cut_paste_test_helper.utils.copy();
  },
  pasteOnLine: function(line, done) {
    ep_script_copy_cut_paste_test_helper.utils.pasteAtTheEndOfLine(line, done);
  },

  // from https://stackoverflow.com/a/22480938/7884942
  isVisibleOnViewport: function(el) {
    var elemTop = el.getBoundingClientRect().top;
    var elemBottom = el.getBoundingClientRect().bottom;

    var isVisible = (elemTop >= 0) && (elemBottom <= helper.padOuter$.window.innerHeight);
    return isVisible;
  },

  getCloseButton: function(modalSelector) {
    var $modal = helper.padOuter$('.ui-dialog:has(' + modalSelector + ')');
    var $closeButton = $modal.find('.ui-dialog-titlebar-close');
    return $closeButton;
  },

  closeModal: function(modalSelector, done) {
    var utils = ep_comments_page_test_helper.utils;
    var $closeButton = utils.getCloseButton(modalSelector);
    $closeButton.click();

    var $modal = helper.padOuter$('.ui-dialog:has(' + modalSelector + ')');
    helper.waitFor(function() {
      return !$modal.is(':visible');
    }).done(done);
  },

  waitForCommentToBeCreatedOnLine: function(line, done) {
    this.waitForCommentToBeCreatedOnLines([line, line], done);
  },

  waitForCommentToBeCreatedOnLines: function(lines, done) {
    var self = this;
    var apiUtils = ep_comments_page_test_helper.apiUtils;

    // when it has multiple lines selected check if the comment was created in the last line
    var commentLine = lines[1];

    helper.waitFor(function() {
      var idOfCreatedComment = self.getCommentIdOfLine(commentLine);
      var commentIdsSentOnAPI = (apiUtils.getLastDataSent() || []).map(function(commentData) {
        return commentData.commentId;
      });
      return idOfCreatedComment !== null && commentIdsSentOnAPI.includes(idOfCreatedComment);
    }).done(done);
  },

  getCommentDataOfLine: function(lineNumber) {
    var apiUtils = ep_comments_page_test_helper.apiUtils;

    var commentIdOfTargetLine = this.getCommentIdOfLine(lineNumber);
    var comments = apiUtils.getLastDataSent();
    var commentData = _(comments || []).find(function(commentData) {
      return commentData.commentId === commentIdOfTargetLine;
    });

    return commentData;
  },
  getCommentIdOfLine: function(lineNumber) {
    return this.getCommentIdsOfLine(lineNumber)[0] || null;
  },
  getReplyIdOfLine: function(lineNumber) {
    return this.getReplyIdsOfLine(lineNumber)[0] || null;
  },
  getCommentIdsOfLine: function(lineNumber) {
    return this.getCommentOrReplyIdsOfLine(lineNumber, /(?:^| )(c-[A-Za-z0-9]*)/, '.comment');
  },
  getReplyIdsOfLine: function(lineNumber) {
    return this.getCommentOrReplyIdsOfLine(lineNumber, /(?:^| )(cr-[A-Za-z0-9]*)/, '.comment-reply');
  },
  getCommentOrReplyIdsOfLine: function(lineNumber, regexOfIdOnText, selectorOfElementOnText) {
    var $line = this.getLine(lineNumber);
    var $commentsOrRepliesOnLine = $line.find(selectorOfElementOnText);
    var idsOnLine = $commentsOrRepliesOnLine.map(function() {
      return _(this.classList).filter(function(cls) {
        return regexOfIdOnText.test(cls);
      });
    });
    return idsOnLine;
  },

  commentIconsEnabled: function() {
    return helper.padOuter$('#commentIcons').length > 0;
  },

  clickEditCommentButton: function () {
    var outer$ = helper.padOuter$;
    var $editButton = outer$('.comment-edit').first();
    $editButton.click();
  },

  clickEditCommentReplyButton: function () {
    var outer$ = helper.padOuter$;
    var $threeDots = outer$('.comment-options-button').last();
    $threeDots.click();
    var $editButton = outer$('.comment-edit').last();
    $editButton.click();
  },

  changeEtherpadLanguageTo: function(lang, callback) {
    var boldTitles = {
      'en' : 'Bold (Ctrl+B)',
      'pt-br' : 'Negrito (Ctrl-B)',
      'oc' : 'Gras (Ctrl-B)'
    };
    var chrome$ = helper.padChrome$;

    // click on the settings button to make settings visible
    var $settingsButton = chrome$('.buttonicon-settings');
    $settingsButton.click();

    // select the language
    var $language = chrome$('#languagemenu');
    $language.val(lang);
    $language.change();

    // hide settings again
    $settingsButton.click();

    helper.waitFor(function() {
      return chrome$('.buttonicon-bold').parent()[0]['title'] == boldTitles[lang];
    }).done(callback);
  },

  placeCaretOnLine: function(lineNum, done) {
    ep_script_elements_test_helper.utils.placeCaretAtTheEndOfLine(lineNum, done);
  },

  getLineWhereCaretIs: function() {
    return ep_script_elements_test_helper.utils.getLineWhereCaretIs();
  },

  getSelectedText: function() {
    return helper.padInner$.document.getSelection().toString();
  },

  C_KEY_CODE: 67, // shortcut is Cmd + Ctrl + C

  // based on similar method of smUtils
  pressShortcutToAddCommentToLine: function(line, done) {
    this.pressShortcutToAddCommentToLines([line, line], done);
  },

  pressShortcutToAddCommentToLines(lines, done) {
    var self = this;

    this._selectOneOrMoreLines(lines);

    setTimeout(function() {
      self.pressShortcutToAddCommentToSelectedText();
      done();
    }, 1000);
  },

  pressShortcutToAddCommentToSelectedText() {
    var smUtils = ep_script_scene_marks_test_helper.utils;

    var bowser = helper.padInner$(window)[0].bowser;
    var os = bowser.mac ? 'mac' : 'windows';
    var modifierKeys = smUtils.shortcuts.KEYS_MODIFIER_ADD_SCENE_MARK[os];

    smUtils.shortcuts.pressKeyWithModifier(this.C_KEY_CODE, modifierKeys);
  },

  _selectOneOrMoreLines: function(lines) {
    var $beginning = this.getLine(lines[0]);
    var $end = this.getLine(lines[1]);

    helper.selectLines($beginning, $end);
  },

  getCommentInfoDialog: function() {
    return helper.padOuter$('.ui-dialog--comment:has(#text-mark-info)');
  },

  // assume dialogs are closed
  testIfCommentDialogIsClosed: function(done) {
    var self = this;
    helper
      .waitFor(function() {
        return self.getCommentInfoDialog().is(':visible');
      })
      .done(done);
  },

  toggleShowHideReplyButton: function() {
    var $replyButton = helper.padOuter$('.button--show_replies');
    $replyButton.click();
  },

  getReplyContainer: function() {
    return helper.padOuter$('#replies-container');
  },

  isCommentInfoWindowVisible: function() {
    return helper.padOuter$('#text-mark-info').is(':visible');
  },

  // usually when we call this function we did some change the requires some
  // time to be processed (e.g. edit a field). That's why we have to use a
  // "timeout". We ensure when we open the window again we have the most recent
  // data
  reloadCommentWindowAndClickOnShowReplies: function(commentLine, cb) {
    var self = this;
    var apiUtils = ep_comments_page_test_helper.apiUtils;
    setTimeout(function() {
      helper.padOuter$('.ui-dialog-titlebar-close').click(); // close comment window

      // open comment window again
      var commentId = self.getCommentIdOfLine(commentLine);
      apiUtils.simulateCallToShowCommentInfo(commentId);

      helper
        .waitFor(function() {
          // wait to the comment info be displayed
          return self.isCommentInfoWindowVisible();
        })
        .done(function() {
          // show reply window
          self.toggleShowHideReplyButton();
          cb();
        });
    }, 500);
  }
}
