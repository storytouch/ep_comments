var textMarkInfoDialog = require('./textMarkInfoDialog');
var utils = require('./utils');
var commentL10n = require('./commentL10n');

var EDIT_COMMENT_FORM_ID = 'edit-comment';
var INFO_TEMPLATE = {
  id: '#commment-info-template',
  mainComponentSelector: '#text-mark-info',
};
var EDIT_TEMPLATE = {
  id: '#edit-comment-template',
  mainComponentSelector: '#' + EDIT_COMMENT_FORM_ID,
};
var DIALOG_TITLE_KEY = 'ep_comments_page.comments_template.comment';
var TARGET_TYPE = 'comment';
var SHOW_REPLIES_BUTTON_CLASS = '.button--show_replies';
var REPLY_CONTAINER_ID = '#replies-container';
var REPLY_BUTTON_DELETE = '.reply-button--delete';
var REPLY_BUTTON_EDIT = '.reply-button--edit';
var REPLY_BUTTON_SAVE = '.reply-button--save';
var COMMENT_WINDOW_CLASS = '.ui-dialog--comment';
var COMMENT_ID_DATA_ATTR = 'comment-id';
var REPLY_ID_DATA_ATTR = 'reply-id';

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

  // get text from text edit form dialog, after remove it from reply dialog
  var newReplyText = this._getTextFromEditFormDialog(targetData.replyId);
  this._getEditFormDialog(targetData.replyId).remove();

  // set the new reply text on the reply info dialog and make it visible
  // again
  var $originalReply = this._getReplyInfoDialog(targetData.replyId);
  $originalReply.find('.reply-description-body').text(newReplyText);
  $originalReply.children().show();

  // save the reply text on database
  this.thisPlugin.api.onReplyEdition(targetData.commentId, targetData.replyId, newReplyText);
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
  var $replyContainer = this._getReplyInfoDialog(targetData.replyId);

  // hide the info dialog and get the original reply text
  var $infoReplyDialog = $replyContainer.children();
  $infoReplyDialog.hide();
  var originalText = $infoReplyDialog.find('.reply-description-body').text();

  this._buildEditFormAndAddOnReplyContainer(originalText, targetData, $replyContainer);
};

commentInfoDialog.prototype._buildEditFormAndAddOnReplyContainer = function(text, commentAndReplyIds, $replyContainer) {
  var replyData = Object.assign(commentAndReplyIds, { text: text });
  var $editReplyWindow = $('#edit-reply-template').tmpl(replyData);
  $replyContainer.append($editReplyWindow);
  $replyContainer.find('#reply-description').focus(); // change focus to edition
};

commentInfoDialog.prototype._removeReplySectionFromReplyWindow = function(replyId) {
  var classOfReplySection = '.replyId-' + replyId;
  utils
    .getPadOuter()
    .find('#replies-container')
    .find(classOfReplySection)
    .remove();
};

// TODO: implement change of the button name here
commentInfoDialog.prototype.toggleReplyWindow = function() {
  utils
    .getPadOuter()
    .find('#replies-container')
    .toggleClass('hide');
};

commentInfoDialog.prototype.showCommentInfoForId = function(commentId, owner) {
  this.textMarkInfoDialog.showTextMarkInfoDialogForId(commentId, owner);
};

commentInfoDialog.prototype._buildCommentData = function(commentId) {
  var comment = this.thisPlugin.commentDataManager.getDataOfCommentIfStillPresentOnText(commentId);
  var repliesLength = Object.keys(comment.replies).length;
  return {
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
  var repliesLengthValue = '{ "repliesLength": "' + repliesLength + '"}';
  dialog.widget.find(SHOW_REPLIES_BUTTON_CLASS).attr('data-l10n-args', repliesLengthValue);
};

commentInfoDialog.prototype._buildReplyWindow = function(dialog, commentData) {
  dialog.widget.find('#replies-container').remove(); // remove any previous reply window
  var $repliesWindow = $('#replies-info-template').tmpl(commentData);
  var replyWindowContainer = '<div id="replies-container" class="hide">' + $repliesWindow.html() + '</div>';
  dialog.widget.append(replyWindowContainer);
  commentL10n.localize(dialog.widget);
};

commentInfoDialog.prototype.addAdditionalElementsOnInfoDialog = function(infoDialog, commentData) {
  this._updateReplyButtonText(infoDialog, commentData);
  this._buildReplyWindow(infoDialog, commentData);
};

exports.init = function(ace) {
  return new commentInfoDialog(ace);
};
