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
var REPLY_CONTAINER_ID = '#replies-container';
var REPLY_BUTTON_DELETE = '.reply-button--delete';
var REPLY_BUTTON_EDIT = '.reply-button--edit';
var REPLY_BUTTON_SAVE = '.reply-button--save';
var REPLY_BUTTON_CANCEL = '.reply-button--cancel';
var COMMENT_WINDOW_CLASS = '.ui-dialog--comment';
var COMMENT_ID_DATA_ATTR = 'comment-id';
var REPLY_ID_DATA_ATTR = 'reply-id';
var COMMENT_DATE_CLASS = 'comment-date';
var COMMENT_INFO_BUTTON_CONTAINER = '.ui-dialog-buttonset';

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
        handler: this.toggleReplyWindow,
        buttonL10nArgs: '{"repliesLength": "0"}',
      },
    ],
  });
  this.showCommentInfoForId = this.showCommentInfoForId;
  this.addListenerOfReplyButtons();
};

commentInfoDialog.prototype.addListenerOfReplyButtons = function() {
  var $commentWindow = utils.getPadOuter().find(COMMENT_WINDOW_CLASS);
  $commentWindow.on('click', REPLY_BUTTON_DELETE, this._handleReplyRemoval.bind(this));
  $commentWindow.on('click', REPLY_BUTTON_EDIT, this._handleReplyEdition.bind(this));
  $commentWindow.on('click', REPLY_BUTTON_SAVE, this._handleReplySave.bind(this));
  $commentWindow.on('click', REPLY_BUTTON_CANCEL, this._handleReplyCancelEdition.bind(this));
};

commentInfoDialog.prototype._getTargetData = function(e) {
  var $button = $(e.currentTarget);
  return {
    commentId: $button.data(COMMENT_ID_DATA_ATTR),
    replyId: $button.data(REPLY_ID_DATA_ATTR),
  };
};

commentInfoDialog.prototype._handleReplySave = function(event) {
  event.preventDefault(); // avoid reload the editor
  var targetData = this._getTargetData(event);
  var replyId = targetData.replyId;

  // get text from text edit form dialog, after remove it from reply dialog
  var newReplyText = this._getTextFromEditFormDialog(replyId);

  // avoid saving empty replies
  if (newReplyText.trim().length) {
    this._getEditFormDialog(replyId).remove();

    // set the new reply text on the reply info dialog and make it visible
    // again
    var $originalReply = this._getReplyInfoDialog(targetData.replyId);
    $originalReply.find('.reply-description-body').text(newReplyText);
    this._showOrHideInfoReplyDialog(replyId, true);

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
  var classOfReplySection = '.replyId-' + replyId;
  return utils
    .getPadOuter()
    .find(REPLY_CONTAINER_ID)
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
  var $infoReplyDialog = $replyContainer.children();
  return $infoReplyDialog.find('.reply-description-body').text();
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
  var classOfReplySection = '.replyId-' + replyId;
  utils
    .getPadOuter()
    .find('#replies-container')
    .find(classOfReplySection)
    .remove();
};

commentInfoDialog.prototype._handleReplyCancelEdition = function(event) {
  event.preventDefault(); // avoid to reload the page
  var targetData = this._getTargetData(event);
  var replyId = targetData.replyId;
  this._getEditFormDialog(replyId).remove(); // remove the edit dialog
  this._showOrHideInfoReplyDialog(replyId, true); // show the info reply dialog that was hidden
};

commentInfoDialog.prototype._showOrHideInfoReplyDialog = function(replyId, displayElement) {
  var $replyContainer = this._getReplyInfoDialog(replyId);
  var $infoReplyDialog = $replyContainer.children();
  $infoReplyDialog.toggle(displayElement); // when displayElement is true, it shows the element
};

commentInfoDialog.prototype.toggleReplyWindow = function(commentId, event) {
  var $repliesContainer = utils.getPadOuter().find('#replies-container');
  $repliesContainer.toggle(); // hide or display

  var repliesContainerIsVisible = $repliesContainer.is(':visible');
  var buttonL10nKey = repliesContainerIsVisible ? HIDE_REPLIES_KEY : SHOW_REPLIES_KEY;

  // here we [1] update button text, and [2] force the translation
  var $showOrHideRepliesButton = $(event.currentTarget);
  var l10nIdValue = EP_COMMENT_L10N_PREFIX + buttonL10nKey;
  $showOrHideRepliesButton.attr('data-l10n-id', l10nIdValue); // [1]
  commentL10n.localize($showOrHideRepliesButton); // [2]
};

commentInfoDialog.prototype.showCommentInfoForId = function(commentId, owner) {
  this.textMarkInfoDialog.showTextMarkInfoDialogForId(commentId, owner);
};

commentInfoDialog.prototype._buildAuthorInitials = function(name) {
  var names = name.trim().split(' ');
  var thereIsALastName = names.length > 1;

  var firstInitial = names[0][0];
  var lastInitial = thereIsALastName ? names[names.length - 1][0] : names[0][1];
  var userInitials = (firstInitial || '') + (lastInitial || '');

  return userInitials.toUpperCase();
};

commentInfoDialog.prototype._buildCommentData = function(commentId) {
  var comment = this.thisPlugin.commentDataManager.getDataOfCommentIfStillPresentOnText(commentId);
  var repliesLength = Object.keys(comment.replies).length;
  var initials = this._buildAuthorInitials(comment.name);
  return {
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

commentInfoDialog.prototype._updateReplyButtonText = function(dialog, commentData) {
  var repliesLength = commentData.repliesLength;

  // does not show button if there is not replies
  var hasReplies = repliesLength > 0;
  dialog.widget.find(SHOW_REPLIES_BUTTON_CLASS).toggle(hasReplies);

  var repliesLengthValue = '{ "repliesLength": "' + repliesLength + '"}';
  dialog.widget.find(SHOW_REPLIES_BUTTON_CLASS).attr('data-l10n-args', repliesLengthValue);
};

commentInfoDialog.prototype._buildRepliesData = function(commentData) {
  var self = this;
  var replies = commentData.replies;
  var hasReplies = Object.keys(replies).length;
  if (!hasReplies) return;

  // we add the field initials and the date that was created into the original
  // reply data
  return _(replies).map(function(reply) {
    var initials = self._buildAuthorInitials(reply.name);
    var prettyDate = self._buildPrettyDate(reply.timestamp);

    return Object.assign(reply, {
      initials: initials,
      prettyDate: prettyDate,
    });
  });
};

commentInfoDialog.prototype._buildReplyWindow = function(dialog, commentData) {
  dialog.widget.find('#replies-container').remove(); // remove any previous reply window
  var repliesData = { replies: this._buildRepliesData(commentData) };
  var $repliesWindow = $('#replies-info-template').tmpl(repliesData);

  // reply container is hidden by default
  var replyWindowContainer = '<div id="replies-container" style="display: none;">' + $repliesWindow.html() + '</div>';
  dialog.widget.append(replyWindowContainer);
  commentL10n.localize(dialog.widget);
};

// this function receives a date in timestamp and returns in a format like "12/3/2018, 2:48 PM"
commentInfoDialog.prototype._buildPrettyDate = function(timestamp) {
  return new Date(timestamp).toLocaleString(undefined, DATE_FORMAT_OPTIONS);
};

commentInfoDialog.prototype._addDateFieldToComment = function(dialog, commentData) {
  dialog.widget.find('.' + COMMENT_DATE_CLASS).remove(); // remove any previous occurrence of comment date
  var prettyDate = this._buildPrettyDate(commentData.timestamp);
  dialog.widget
    .find(COMMENT_INFO_BUTTON_CONTAINER)
    .append('<span class="' + COMMENT_DATE_CLASS + '">' + prettyDate + '</span>');
};

commentInfoDialog.prototype.addAdditionalElementsOnInfoDialog = function(infoDialog, commentData) {
  this._updateReplyButtonText(infoDialog, commentData);
  this._addDateFieldToComment(infoDialog, commentData);
  this._buildReplyWindow(infoDialog, commentData);
};

exports.init = function(ace) {
  return new commentInfoDialog(ace);
};
