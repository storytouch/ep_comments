var eascUtils = require('ep_script_toggle_view/static/js/utils');
var SHORTCUT_BASE = require('ep_script_scene_marks/static/js/constants').TEKSTO_SHORTCUT_BASE;
var utils = require('./utils');

var SHORTCUT_KEY = 'C';

exports.processAceKeyEvent = function(context) {
  // handles key events only in ScriptDocument pads
  var isScriptDocumentPad = pad.plugins.ep_comments_page.padType.isScriptDocumentPad();
  if (!isScriptDocumentPad) return false;

  var evt = context.evt;
  var key = String.fromCharCode(evt.which);

  var eventProcessed = false;

  var cmdAndCtrlPressed = eascUtils.isModifierKeyPressed(evt, SHORTCUT_BASE);
  if (cmdAndCtrlPressed && key === SHORTCUT_KEY) {
    evt.preventDefault();
    pad.plugins.ep_comments_page.commentHandler.displayNewCommentForm(context);
    eventProcessed = true;
  }

  return eventProcessed;
}
