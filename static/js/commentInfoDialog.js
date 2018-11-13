var textMarkInfoDialog = require('./textMarkInfoDialog');

var INFO_TEMPLATE = {
  id: '#commment-info-template',
  mainComponentSelector: '#text-mark-info',
};
var DIALOG_TITLE_KEY = 'ep_comments_page.comments_template.comment';
var TARGET_TYPE = 'comment';

var commentInfoDialog = function(ace) {
  this.thisPlugin = pad.plugins.ep_comments_page;
  this.textMarkInfoDialog = textMarkInfoDialog.init({
    ace: ace,
    buildTextMarkData: this._buildCommentData.bind(this),
    infoTemplate: INFO_TEMPLATE,
    dialogTitleKey: DIALOG_TITLE_KEY,
    targetType: TARGET_TYPE,
  });
  this.showCommentInfoForId = this.showCommentInfoForId.bind(this);
};

commentInfoDialog.prototype.showCommentInfoForId = function(commentId, owner) {
  this.textMarkInfoDialog.showTextMarkInfoDialogForId(commentId, owner);
};

commentInfoDialog.prototype._buildCommentData = function(commentId) {
  var comment = this.thisPlugin.commentHandler.commentDataManager.getComment(commentId);
  return {
    description: comment.text,
  };
};

exports.init = function(ace) {
  return new commentInfoDialog(ace);
};
