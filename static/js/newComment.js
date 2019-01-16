var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var utils = require('./utils');
var dialog = require('./dialog');
// make sure $.tmpl is loaded
require('./lib/jquery.tmpl.min');

var newCommentDialog;

// Insert a comment node
exports.createNewCommentForm = function(ace) {
  var $content = $('#newCommentTemplate').tmpl(utils.getUserInfo());
  var configs = {
    $content: $content,
    dialogTitleL10nKey: 'ep_comments_page.comments_template.comment',
    ace: ace,
    targetType: 'comment',
    onSubmit: submitNewComment,
  }
  newCommentDialog = dialog.create(configs);
};

// Callback for new comment Submit
var submitNewComment = function($form, preMarkedTextRepArr, callbackOnSubmit) {
  var text = $form.find('.comment-content').val();
  var commentTextIsNotEmpty = text.length !== 0;
  if (commentTextIsNotEmpty) {
    hideNewCommentForm();
    callbackOnSubmit(text, preMarkedTextRepArr);
  }
}

var hideNewCommentForm = function() {
  newCommentDialog.close();
}

exports.showNewCommentForm = function(comment, aceContext, callbackOnSubmit) {
  comment.commentId = "";

  newCommentDialog.open(aceContext, callbackOnSubmit);
}
