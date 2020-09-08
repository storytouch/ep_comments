var shared = require('./shared');

var commentObserverOnText = function() {
  var thisPlugin = pad.plugins.ep_comments_page;
  var textMarksObserver = thisPlugin.textMarksObserver;
  var dataManager = thisPlugin.commentDataManager;
  var icons = thisPlugin.commentIcons;

  textMarksObserver.observeAttribute(shared.COMMENT_PREFIX_KEY, function(textMarkOccurrences, lineOfChange) {
    icons.updateIconPositions(textMarkOccurrences, lineOfChange);
    dataManager.triggerDataChanged(textMarkOccurrences);
  });
};

exports.init = function() {
  return new commentObserverOnText();
};
