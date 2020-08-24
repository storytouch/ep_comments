var _ = require('ep_etherpad-lite/static/js/underscore');
var randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString;

var COMMENT_PREFIX_KEY = 'comment-c-';
exports.COMMENT_PREFIX_KEY = COMMENT_PREFIX_KEY;

var REPLY_PREFIX_KEY = 'comment-reply-';
exports.REPLY_PREFIX_KEY = REPLY_PREFIX_KEY;

var COMMENT_PREFIX = 'c-';
exports.COMMENT_PREFIX = COMMENT_PREFIX;

var REPLY_PREFIX = 'cr-';

exports.FAKE_ID_PREFIX = 'fake-';
var FAKE_ID_PREFIX = exports.FAKE_ID_PREFIX;

exports.collectContentPre = function(hook, context){
  collectAttribFrom(context, REPLY_PREFIX, 'comment-reply-');

  var commentIds = getIdsFrom(context.cls, COMMENT_PREFIX);
  _.each(commentIds, function(commentId) {
    var commentValue = 'comment-' + commentId; // e.g. comment-c-123
    context.cc.doAttrib(context.state, commentValue + '::' + commentId);
  });
};

exports.getIdsFrom = function(str, classPrefix) {
  // ex: regex = /(?:^| |fake-)(cr-[A-Za-z0-9]*)/g
  var regex = new RegExp('(?:^| |' + FAKE_ID_PREFIX + ')(' + classPrefix + '[A-Za-z0-9]*)', 'g');

  var ids = (str || '').match(regex) || [];

  // replace fake ids with the real ones
  ids = _(ids).map(function(id) {
    var cleanId = id.trim();
    if (cleanId.startsWith(FAKE_ID_PREFIX)) {
      // make sure fake id mapper is ready to be used
      if ((((pad || {}).plugins || {}).ep_comments_page || {}).fakeIdsMapper) {
        cleanId = pad.plugins.ep_comments_page.fakeIdsMapper.getRealIdOfFakeId(cleanId);
      }
    }
    return cleanId;
  });

  return ids;
}
var getIdsFrom = exports.getIdsFrom;

exports.collectAttribFrom = function(context, classPrefix, attribPrefix) {
  attribPrefix = attribPrefix || '';

  var ids = getIdsFrom(context.cls, classPrefix);

  // there might be more than one attrib id on the same text segment
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    var attribName = attribPrefix + id;
    var attribValue = id;
    context.cc.doAttrib(context.state, attribName + '::' + attribValue);
  }
}
var collectAttribFrom = exports.collectAttribFrom;

exports.getCommentIdsFrom = function(str) {
  return getIdsFrom(str, COMMENT_PREFIX);
}

exports.getReplyIdsFrom = function(str) {
  return getIdsFrom(str, REPLY_PREFIX);
}

exports.generateCommentId = function(){
  return COMMENT_PREFIX + randomString(16);
}

exports.generateReplyId = function(){
  return REPLY_PREFIX + randomString(16);
}
