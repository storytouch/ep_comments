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
  var self = this;
  utils.getPadOuter().find('.ui-dialog--comment').on('click', '.reply-button--delete', function(e) {
    self._handleReplyRemoval(e);
  })
}

commentInfoDialog.prototype._handleReplyRemoval = function(e) {
  var replyId = $(e.currentTarget).data('reply-id');
  var commentId = $(e.currentTarget).data('comment-id');
  this._removeReplySectionFromReplyWindow(replyId);
  this.thisPlugin.api.onReplyDeletion(replyId, commentId);
}

commentInfoDialog.prototype._removeReplySectionFromReplyWindow = function(replyId) {
  var classOfReplySection = '.replyId-' + replyId;
  utils.getPadOuter().find('#replies-container').find(classOfReplySection).remove();
}

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
