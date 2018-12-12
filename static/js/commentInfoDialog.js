var _ = require('ep_etherpad-lite/static/js/underscore');

var textMarkInfoDialog = require('./textMarkInfoDialog');
var utils = require('./utils');
var commentL10n = require('./commentL10n');

var DATE_FORMAT_OPTIONS = {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};
var SHOW_REPLIES_KEY = 'show_replies';
var HIDE_REPLIES_KEY = 'hide_replies';
var EDIT_COMMENT_FORM_ID = 'edit-comment';
var INFO_TEMPLATE = {
  id: '#commment-info-template',
  mainComponentSelector: '#text-mark-info',
};
var EDIT_TEMPLATE = {
  id: '#edit-comment-template',
  mainComponentSelector: '#' + EDIT_COMMENT_FORM_ID,
};

var EP_COMMENT_L10N_PREFIX = 'ep_comments_page.comments_template.';
var DIALOG_TITLE_KEY = EP_COMMENT_L10N_PREFIX + 'comment';
var TARGET_TYPE = 'comment';
var SHOW_REPLIES_BUTTON_CLASS = '.button--show_replies';
var REPLY_CONTAINER_ID = 'replies-container';
var REPLY_BUTTON_DELETE = '.reply-button--delete';
var REPLY_BUTTON_EDIT = '.reply-button--edit';
var REPLY_BUTTON_SAVE = '.reply-button--save';
var REPLY_BUTTON_CANCEL = '.reply-button--cancel';
var COMMENT_WINDOW_CLASS = '.ui-dialog--comment';
var COMMENT_ID_DATA_ATTR = 'comment-id';
var REPLY_ID_DATA_ATTR = 'reply-id';
var COMMENT_DATE_CLASS = 'comment-date';
var COMMENT_INFO_BUTTON_CONTAINER = '.ui-dialog-buttonset';
var REPLY_DESCRIPTION_BODY_CLASS = '.comment-reply-body';
var REPLY_ID_CLASS_PREFIX = '.replyId-';
var ADD_REPLY_COLLAPSE_CLASS = 'new-reply--collapsed';
var ADD_REPLY = '.reply-content--input';
var ADD_REPLY_CANCEL = '.add-reply-button--cancel';
var ADD_REPLY_SAVE = '.add-reply-button--save';
var ADD_REPLY_FORM_ID_PREFIX = '#newReply--';

var commentInfoDialog = function(ace) {
  this.thisPlugin = pad.plugins.ep_comments_page;
  this.textMarkInfoDialog = textMarkInfoDialog.init({
    ace: ace,
    buildTextMarkData: this._buildCommentData.bind(this),
    infoTemplate: INFO_TEMPLATE,
    editTemplate: EDIT_TEMPLATE,
    dialogTitleKey: DIALOG_TITLE_KEY,
    targetType: TARGET_TYPE,
    editTextMarkFormId: EDIT_COMMENT_FORM_ID,
    saveTextMark: this._saveComment.bind(this),
    removeTextMark: this._removeComment.bind(this),
    addAdditionalElementsOnInfoDialog: this.addAdditionalElementsOnInfoDialog.bind(this),
    infoDialogCustomButtons: [
      {
        buttonName: 'show_replies',
        handler: this.toggleReplyWindow.bind(this),
        buttonL10nArgs: '{"repliesLength": "0"}',
      },
    ],
  });
  this.userLocale = window.navigator.language; // expose to be able to change it on tests
  this.showCommentInfoForId = this.showCommentInfoForId;
  this.addListenerOfReplyButtons();
};

commentInfoDialog.prototype.addListenerOfReplyButtons = function() {
  var $commentWindow = utils.getPadOuter().find(COMMENT_WINDOW_CLASS);
  $commentWindow.on('click', REPLY_BUTTON_DELETE, this._handleReplyRemoval.bind(this));
  $commentWindow.on('click', REPLY_BUTTON_EDIT, this._handleReplyEdition.bind(this));
  $commentWindow.on('click', REPLY_BUTTON_SAVE, this._handleReplySave.bind(this));
  $commentWindow.on('click', REPLY_BUTTON_CANCEL, this._handleReplyCancelEdition.bind(this));

  // add reply dialog listeners
  $commentWindow.on('click', ADD_REPLY, this._displayAddReplyForm.bind(this));
  $commentWindow.on('click', ADD_REPLY_CANCEL, this._handleReplyCancelAddition.bind(this));
  $commentWindow.on('click', ADD_REPLY_SAVE, this._handleReplySaveAddition.bind(this));
};

commentInfoDialog.prototype._getTargetData = function(e) {
  var $button = $(e.currentTarget);
  return {
    commentId: $button.data(COMMENT_ID_DATA_ATTR),
    replyId: $button.data(REPLY_ID_DATA_ATTR),
  };
};

commentInfoDialog.prototype._handleReplySave = function(event) {
  event.preventDefault(); // avoid reloading the editor
  var targetData = this._getTargetData(event);
  var replyId = targetData.replyId;

  // get text from text edit form dialog, after remove it from reply dialog
  var newReplyText = this._getTextFromEditFormDialog(replyId);

  // avoid saving empty replies
  if (newReplyText.trim().length) {
    this._getEditFormDialog(replyId).remove();

    // [1] set the new reply text and [2] the time when the edition was made on
    // the reply info dialog and [3] make it visible again
    var $originalReply = this._getReplyInfoDialog(targetData.replyId);
    $originalReply.find(REPLY_DESCRIPTION_BODY_CLASS).text(newReplyText); // [1]
    var timeNow = new Date().getTime();
    var dateOfEdition = this._buildPrettyDate(timeNow);
    $originalReply.find('.reply-date').text(dateOfEdition); // [2]
    this._showOrHideInfoReplyDialog(replyId, true); // [3]

    // save the reply text on database
    this.thisPlugin.api.onReplyEdition(targetData.commentId, replyId, newReplyText);
  }
};

commentInfoDialog.prototype._getEditFormDialog = function(replyId) {
  return utils.getPadOuter().find('#edit-reply-' + replyId);
};

commentInfoDialog.prototype._getTextFromEditFormDialog = function(replyId) {
  return this._getEditFormDialog(replyId)
    .find('#reply-description')
    .val();
};

commentInfoDialog.prototype._getReplyInfoDialog = function(replyId) {
  var classOfReplySection = REPLY_ID_CLASS_PREFIX + replyId;
  return utils
    .getPadOuter()
    .find('#' + REPLY_CONTAINER_ID)
    .find(classOfReplySection);
};

commentInfoDialog.prototype._handleReplyRemoval = function(event) {
  var targetData = this._getTargetData(event);
  this._removeReplySectionFromReplyWindow(targetData.replyId);
  this.thisPlugin.api.onReplyDeletion(targetData.replyId, targetData.commentId);
};

// we use the same container to display the info and the edit dialog. The edit
// dialog is appended only when there is an edition
commentInfoDialog.prototype._handleReplyEdition = function(event) {
  var targetData = this._getTargetData(event);
  var replyId = targetData.replyId;

  // hide the info dialog
  this._showOrHideInfoReplyDialog(replyId, false);

  // show the edit form and pre-fill with the reply original text
  this._buildEditFormAndAddOnReplyContainer(targetData);
};

commentInfoDialog.prototype._getTextOfInfoReplyDialog = function(replyId) {
  var $replyContainer = this._getReplyInfoDialog(replyId);
  return $replyContainer.find(REPLY_DESCRIPTION_BODY_CLASS).text();
};

commentInfoDialog.prototype._buildEditFormAndAddOnReplyContainer = function(commentAndReplyIds) {
  // build the edit form
  var replyId = commentAndReplyIds.replyId;
  var replyOriginalText = this._getTextOfInfoReplyDialog(replyId);
  var replyData = Object.assign(commentAndReplyIds, { text: replyOriginalText });
  var $editReplyWindow = $('#edit-reply-template').tmpl(replyData);

  // add it to the reply container
  var $replyContainer = this._getReplyInfoDialog(replyId);
  $replyContainer.append($editReplyWindow);
  $replyContainer.find('#reply-description').focus(); // change focus to the description field
};

commentInfoDialog.prototype._removeReplySectionFromReplyWindow = function(replyId) {
  var classOfReplySection = REPLY_ID_CLASS_PREFIX + replyId;
  utils
    .getPadOuter()
    .find('#' + REPLY_CONTAINER_ID)
    .find(classOfReplySection)
    .remove();
};

commentInfoDialog.prototype._handleReplyCancelEdition = function(event) {
  var targetData = this._getTargetData(event);
  var replyId = targetData.replyId;
  this._getEditFormDialog(replyId).remove(); // remove the edit dialog
  this._showOrHideInfoReplyDialog(replyId, true); // show the info reply dialog that was hidden
};

commentInfoDialog.prototype._displayAddReplyForm = function(event) {
  var $textArea = $(event.currentTarget);
  $textArea.parents('.new-reply').removeClass(ADD_REPLY_COLLAPSE_CLASS);
};

commentInfoDialog.prototype._getAddReplyFormId = function(commentId) {
  return ADD_REPLY_FORM_ID_PREFIX + commentId;
};

commentInfoDialog.prototype._getAddReplyForm = function(commentId) {
  var formId = this._getAddReplyFormId(commentId);
  var $addReplyForm = utils.getPadOuter().find(formId);
  return $addReplyForm;
};

commentInfoDialog.prototype._resetAddReplyForm = function(commentId) {
  var $addReplyForm = this._getAddReplyForm(commentId);
  var $textArea = $addReplyForm.find('textarea');
  $textArea.val('');
  $addReplyForm.addClass(ADD_REPLY_COLLAPSE_CLASS); // collapse form
};

commentInfoDialog.prototype._handleReplyCancelAddition = function(event) {
  var commentId = this._getTargetData(event).commentId;
  this._resetAddReplyForm(commentId);
};

commentInfoDialog.prototype._getTextOfAddReplyForm = function($addReplyForm) {
  var $textArea = $addReplyForm.find('textarea');
  var replyText = $textArea.val();
  return replyText;
};

commentInfoDialog.prototype._handleReplySaveAddition = function(event) {
  event.preventDefault(); // avoid reloading
  var commentId = this._getTargetData(event).commentId;
  var showReplyDialogAfterAddition = this._shouldForceShowReplyDialogAfterAddition();
  var $addReplyForm = this._getAddReplyForm(commentId);
  var replyText = this._getTextOfAddReplyForm($addReplyForm);
  var self = this;

  this.thisPlugin.api.onReplyCreate(commentId, replyText, function() {
    var $infoDialog = $addReplyForm.parents('.ui-dialog--comment');
    var commentData = self._buildCommentData(commentId);
    self._createOrRecreateReplyDialog($infoDialog, commentData);

    self.toggleReplyWindow(commentId, event, showReplyDialogAfterAddition);
  });
};

// we only show the reply dialog after addition either when it was previously
// visible or when it adds the first comment reply
commentInfoDialog.prototype._shouldForceShowReplyDialogAfterAddition = function() {
  var $repliesContainer = utils.getPadOuter().find('#' + REPLY_CONTAINER_ID);
  var hasReplyContainer = $repliesContainer.length;
  var replyContainerIsVisible = $repliesContainer.is(':visible');
  return replyContainerIsVisible || !hasReplyContainer;
};

commentInfoDialog.prototype._showOrHideInfoReplyDialog = function(replyId, displayElement) {
  var $replyContainer = this._getReplyInfoDialog(replyId);
  var $infoReplyDialog = $replyContainer.children();
  $infoReplyDialog.toggle(displayElement); // when displayElement is true, it shows the element
};

// [1] update button text, and [2] force the translation
commentInfoDialog.prototype._updateToggleRepliesButton = function($repliesContainer) {
  var $toggleRepliesButton = $repliesContainer.parent().find('.button--show_replies');
  var repliesContainerIsVisible = !$repliesContainer.hasClass('hidden');
  var buttonL10nKey = repliesContainerIsVisible ? HIDE_REPLIES_KEY : SHOW_REPLIES_KEY;
  var l10nIdValue = EP_COMMENT_L10N_PREFIX + buttonL10nKey;
  $toggleRepliesButton.attr('data-l10n-id', l10nIdValue); // [1]
  commentL10n.localize($toggleRepliesButton); // [2]
};

/*
 [1] "shouldMakeReplyWindowVisible" is optional.
 [2] When user adds a first comment reply or when adds a reply and the reply
 window is visible, we force the reply window gets visible after the operation
 [3] The general case, just toggle the reply window visibility
 */
commentInfoDialog.prototype.toggleReplyWindow = function(commentId, event, shouldMakeReplyWindowVisible) { // [1]
  var $repliesContainer = utils.getPadOuter().find('#' + REPLY_CONTAINER_ID);
  var forceVisibilityState = shouldMakeReplyWindowVisible !== undefined;
  if (forceVisibilityState) {
    $repliesContainer.toggleClass('hidden', !shouldMakeReplyWindowVisible); // [2]
  } else {
    $repliesContainer.toggleClass('hidden'); // [3]
  }
  this._updateToggleRepliesButton($repliesContainer);
};

commentInfoDialog.prototype.showCommentInfoForId = function(commentId, owner) {
  this.textMarkInfoDialog.showTextMarkInfoDialogForId(commentId, owner);
};

commentInfoDialog.prototype._buildCommentData = function(commentId) {
  var comment = this.thisPlugin.commentDataManager.getDataOfCommentIfStillPresentOnText(commentId);
  var hasComment = Object.keys(comment).length;
  if (!hasComment) return {};

  var repliesLength = Object.keys(comment.replies).length;
  var initials = utils.buildUserInitials(comment.name);
  return {
    commentId: comment.commentId,
    initials: initials,
    author: comment.name,
    sceneNumber: comment.scene,
    timestamp: comment.timestamp,
    formId: EDIT_COMMENT_FORM_ID,
    description: comment.text,
    replies: comment.replies,
    repliesLength: repliesLength,
  };
};

commentInfoDialog.prototype._saveComment = function(commentId, $formContainer, cb) {
  var description = $formContainer.find('#comment-description').val();
  this.thisPlugin.api.onCommentEdition(commentId, description, cb);
};

commentInfoDialog.prototype._removeComment = function(commentId) {
  this.thisPlugin.api.onCommentDeletion(commentId);
};

commentInfoDialog.prototype._updateReplyButtonText = function($infoDialog, commentData) {
  var hasCommentData = Object.keys(commentData).length;
  var repliesLength = hasCommentData ? commentData.repliesLength : 0;
  var $toggleRepliesButton = $infoDialog.find(SHOW_REPLIES_BUTTON_CLASS);

  // does not show button if there is not replies
  var hasReplies = repliesLength > 0;
  $toggleRepliesButton.toggle(hasReplies);

  var l10nIdValue = EP_COMMENT_L10N_PREFIX + SHOW_REPLIES_KEY;
  $toggleRepliesButton.attr('data-l10n-id', l10nIdValue);
  var repliesLengthValue = '{ "repliesLength": "' + repliesLength + '"}';
  $toggleRepliesButton.attr('data-l10n-args', repliesLengthValue);
};

commentInfoDialog.prototype._buildRepliesData = function(commentData) {
  var self = this;
  var replies = commentData.replies;

  // we add the fields initials and the date that was created into the original
  // reply data
  return _(replies).map(function(reply) {
    var initials = utils.buildUserInitials(reply.name);
    var prettyDate = self._buildPrettyDate(reply.timestamp);

    return Object.assign(reply, {
      initials: initials,
      prettyDate: prettyDate,
    });
  });
};

commentInfoDialog.prototype._buildReplyWindow = function($infoDialog, commentData) {
  $infoDialog.find('#' + REPLY_CONTAINER_ID).remove(); // remove any previous reply window
  var hasReplies = Object.keys(commentData).length && Object.keys(commentData.replies).length;
  if (hasReplies) {
    var repliesData = { replies: this._buildRepliesData(commentData) };
    var $repliesWindow = $('#replies-info-template').tmpl(repliesData);

    // reply container is hidden by default
    var defaultStyle = '" class="hidden"';
    var replyWindowContainer = '<div id="' + REPLY_CONTAINER_ID + defaultStyle + '>' + $repliesWindow.html() + '</div>';
    $infoDialog.append(replyWindowContainer);
    commentL10n.localize($infoDialog);
  }
};

// this function receives a date in timestamp and returns in a format like "12/3/2018, 2:48 PM"
commentInfoDialog.prototype._buildPrettyDate = function(timestamp) {
  return new Date(timestamp).toLocaleString(this.userLocale, DATE_FORMAT_OPTIONS);
};

commentInfoDialog.prototype._addDateFieldToComment = function($infoDialog, commentData) {
  $infoDialog.find('.' + COMMENT_DATE_CLASS).remove(); // remove any previous occurrence of comment date
  var prettyDate = this._buildPrettyDate(commentData.timestamp);
  $infoDialog
    .find(COMMENT_INFO_BUTTON_CONTAINER)
    .append('<div class="' + COMMENT_DATE_CLASS + '">' + '<span>' + prettyDate + '</span>' + '</div>');
};

commentInfoDialog.prototype._addReplyCommentField = function($infoDialog, commentData) {
  var addReplyFormId = this._getAddReplyFormId(commentData.commentId);
  $infoDialog.find(addReplyFormId).remove(); // remove previous forms
  var $newReplyWindow = $('#new-reply-template').tmpl(commentData);
  $infoDialog.append($newReplyWindow);
};

commentInfoDialog.prototype._createOrRecreateReplyDialog = function($infoDialog, commentData) {
  this._updateReplyButtonText($infoDialog, commentData);
  this._buildReplyWindow($infoDialog, commentData);
  this._addReplyCommentField($infoDialog, commentData);
};

commentInfoDialog.prototype.addAdditionalElementsOnInfoDialog = function(infoDialog, commentData) {
  var $infoDialog = infoDialog.widget;
  this._createOrRecreateReplyDialog($infoDialog, commentData);
  this._addDateFieldToComment($infoDialog, commentData);
};

exports.init = function(ace) {
  return new commentInfoDialog(ace);
};
