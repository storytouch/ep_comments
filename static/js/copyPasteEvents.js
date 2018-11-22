var _ = require('ep_etherpad-lite/static/js/underscore');
var utils = require('./utils');
var copyPasteHelper = require('./copyPasteHelper');

var addTextAndDataOfAllHelpersToClipboard = function(e) {
  var clipboardData = e.originalEvent.clipboardData;
  var $copiedHtml = $(clipboardData.getData('text/html') || '<span/>');

  var helpersHaveItemsOnSelection = _(pad.plugins.ep_comments_page.copyPasteHelpers).map(function(helper) {
    return helper.addTextAndDataToClipboard(clipboardData, $copiedHtml);
  });

  var atLeastOneItemChangedClipboard = _(helpersHaveItemsOnSelection).any();
  if (atLeastOneItemChangedClipboard) {
    // override the default copy behavior
    clipboardData.setData('text/html', $copiedHtml.html());
    e.preventDefault();
    defaultCopyWasPrevented = true;
  }

  // if the default copy was not prevented we have to return 'undefined'
  // if we return 'false', we would prevent the default the copy behavior
  return atLeastOneItemChangedClipboard ? atLeastOneItemChangedClipboard : undefined;
}

var saveItemsAndSubItemsOfAllHelpers = function(e) {
  var clipboardData = e.originalEvent.clipboardData;
  _(pad.plugins.ep_comments_page.copyPasteHelpers).each(function(helper) {
    helper.saveItemsAndSubItems(clipboardData);
  });
}

exports.init = function() {
  pad.plugins = pad.plugins || {};
  pad.plugins.ep_comments_page = pad.plugins.ep_comments_page || {};
  pad.plugins.ep_comments_page.copyPasteHelpers = pad.plugins.ep_comments_page.copyPasteHelpers || [];
}

// Enable ep_copy_cut_paste to call our handlers for copy, cut & paste events
exports.handlePaste = saveItemsAndSubItemsOfAllHelpers;
// As we don't need to remove the text from the pad anymore (ep_copy_cut_paste
// will handle that), we can simply have a single handler for copy & cut events
exports.handleCopy = addTextAndDataOfAllHelpersToClipboard;

exports.listenToCopyCutPasteEventsOfItems = function(configs) {
  var helper = copyPasteHelper.init(configs);
  pad.plugins.ep_comments_page.copyPasteHelpers.push(helper)
}
