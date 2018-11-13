var $ = require('ep_etherpad-lite/static/js/rjquery').$;

var utils = require('./utils');
var dialog = require('./dialog');

// TODO: refactor it!
// this proly does not make sense for comments. We should check this code
// when we prepare the migration for ep_touches
var NON_SCROLLABLE_EVENT = 'selectNonFilteredTagOccurrence';
exports.NON_SCROLLABLE_EVENT = NON_SCROLLABLE_EVENT;

var DO_NOTHING = function() {};

/*
  values of 'props'. All of them are required
  ace: object reference to context.ace
  buildTextMarkData: function that builds the object that is displayed on the window
  infoTemplate: object with strings id and mainComponentSelector
  dialogTitleKey: string with L10n key used on window title
  targetType: string used on dialog config.
*/

var textMarkInfoDialog = function(props) {
  var ace = props.ace;
  this.buildTextMarkData = props.buildTextMarkData;
  this.infoTemplate = props.infoTemplate;
  this.dialogTitleKey = props.dialogTitleKey;
  this.textMarkIdBeingDisplayed = undefined;
  this.targetType = props.targetType;
  this.infoDialog = this._createInfoDialog(ace);
};

textMarkInfoDialog.prototype._createInfoDialog = function(ace) {
  // $content will be filled with data later, when dialog is opened
  var $emptyContent = $('<div><div id="text-mark-info"></div></div>');
  var configs = {
    $content: $emptyContent,
    dialogTitleL10nKey: this.dialogTitleKey,
    ace: ace,
    targetType: this.targetType,
    onSubmit: DO_NOTHING, // there's no submit on this dialog
    doNotAnimate: true,
    openWithinViewport: true,
    dialogOpts: {
      buttons: [],
    },
  };
  return dialog.create(configs);
};

textMarkInfoDialog.prototype.showTextMarkInfoDialogForId = function(textMarkId, owner) {
  var self = this;
  var selectTextUsedAsReferenceForDialogPosition = function(dialog) {
    self._selectTextOfBegginingOfTextMark(textMarkId, dialog);
  };
  this._showTextMarkInfoDialog(textMarkId, selectTextUsedAsReferenceForDialogPosition, owner);
};

textMarkInfoDialog.prototype._showTextMarkInfoDialog = function(textMarkId, selectTextUsedAsReferenceForDialogPosition, owner) {
  var self = this;
  this.textMarkIdBeingDisplayed = textMarkId;
  this.currentOwner = owner;

  this._keepCurrentRepSelection(function() {
    var dialog = self.infoDialog;
    self._fillTextMarkContentOnInfoDialog();
    selectTextUsedAsReferenceForDialogPosition(dialog);
    dialog.open(null, DO_NOTHING);
  });
};

textMarkInfoDialog.prototype._keepCurrentRepSelection = function(action) {
  // store original selection, to be able to restore it after `action` is performed
  var currentRep = this._getCurrentRepSelection();

  action();

  // restore original selection
  var getRepPosition = function() {
    return currentRep;
  };
  this._selectTextOfRepPosition(getRepPosition, this.infoDialog);
};

textMarkInfoDialog.prototype._getCurrentRepSelection = function() {
  var currentRep;
  this.infoDialog.ace.callWithAce(function(ace) {
    var rep = ace.ace_getRep();
    // create a copy of the rep
    var copyOfSelStart = rep.selStart.slice(0);
    var copyOfSelEnd = rep.selEnd.slice(0);

    currentRep = [copyOfSelStart, copyOfSelEnd];
  });
  return currentRep;
};

textMarkInfoDialog.prototype._fillTextMarkContentOnInfoDialog = function() {
  this._fillTextMarkContent(this.infoDialog, this.infoTemplate.id, this.infoTemplate.mainComponentSelector);
};

textMarkInfoDialog.prototype._buildTextMarkInfoDataToShowOnTemplate = function(textMarkId) {
  return this.buildTextMarkData(textMarkId);
};

textMarkInfoDialog.prototype._fillTextMarkContent = function(dialog, templateSelector, mainComponentSelector) {
  // fill content with most up-to-date data
  var textMarkId = this.textMarkIdBeingDisplayed;

  var textMarkInfoDataToFillTemplate = this._buildTextMarkInfoDataToShowOnTemplate(textMarkId);

  var $textMarkInfo = $(templateSelector).tmpl(textMarkInfoDataToFillTemplate);

  utils.replaceDialogContentWith($textMarkInfo, dialog, mainComponentSelector);
};

textMarkInfoDialog.prototype._selectTextOfBegginingOfTextMark = function(textMarkId, dialog) {
  var getRepPosition = function(ace) {
    return ace.ace_getRepFromSelector('.' + textMarkId)[0];
  };
  this._selectTextOfRepPosition(getRepPosition, dialog);
};

textMarkInfoDialog.prototype._selectTextOfRepPosition = function(getRepPosition, dialog) {
  dialog.ace.callWithAce(function(ace) {
    // avoid this change to affect editor scroll
    ace.ace_inCallStackIfNecessary(NON_SCROLLABLE_EVENT, function() {
      var repPositionOfTO = getRepPosition(ace);
      ace.ace_performSelectionChange(repPositionOfTO[0], repPositionOfTO[1], true);
      ace.ace_updateBrowserSelectionFromRep();
    });
  });
};

exports.init = function(props) {
  return new textMarkInfoDialog(props);
};
