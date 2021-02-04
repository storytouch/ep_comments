var eejs = require('ep_etherpad-lite/node/eejs/');
var _ = require('ep_etherpad-lite/static/js/underscore');


// Add the props to be supported in export
exports.exportHtmlAdditionalTagsWithData = async function(hook, pad) {
  var commentsUsed = findAllCommentUsedOn(pad);
  var tags = transformCommentsIntoTags(commentsUsed);
  return tags;
};

// Iterate over pad attributes to find only the comment ones
function findAllCommentUsedOn(pad) {
  var comments_used = [];

  pad.pool.eachAttrib(function(key, value){
    if (key.startsWith("comment")) {
      comments_used.push(value);
    }
  });

  return comments_used;
}

// Transforms an array of comment names into comment tags like ["comment-c-1234", "c-1234"]
function transformCommentsIntoTags(comment_names) {
  return _.map(comment_names, function(comment_name) {
    return ["comment-" + comment_name, comment_name];
  });
}

// TODO: when "asyncLineHTMLForExport" hook is available on Etherpad, use it instead of "getLineHTMLForExport"
// exports.asyncLineHTMLForExport = function (hook, context, cb) {
//   cb(rewriteLine);
// }

exports.getLineHTMLForExport = function (hook, context) {
  rewriteLine(context);
}


function rewriteLine(context){
  var lineContent = context.lineContent;
  lineContent = replaceDataByClass(lineContent);
  // TODO: when "asyncLineHTMLForExport" hook is available on Etherpad, return "lineContent" instead of re-setting it
   context.lineContent = lineContent;
   // return lineContent;
 }

function replaceDataByClass(text) {
  return text.replace(/data-comment-.*?=["|'](c-[0-9a-zA-Z]+)["|']/gi, "class='comment $1'");
 }
