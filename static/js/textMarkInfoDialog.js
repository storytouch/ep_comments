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
  infoTemplate: object with strings id and mainComponentSelector of info template
  editTemplate: object with strings id and mainComponentSelector of edit template
  dialogTitleKey: string with L10n key used on window title
  targetType: string used on dialog config.
  editTextMarkFormId: string with 'id' of the text mark form
  saveTextMark: function that saves the object text mark
*/

var textMarkInfoDialog = function(props) {
  var ace = props.ace;
  this.buildTextMarkData = props.buildTextMarkData;
  this.infoTemplate = props.infoTemplate;
  this.editTemplate = props.editTemplate;
  this.dialogTitleKey = props.dialogTitleKey;
  this.editTextMarkFormId = props.editTextMarkFormId; // better refactor it!
  this.saveTextMark = props.saveTextMark;
  this.textMarkIdBeingDisplayed = undefined;
  this.targetType = props.targetType;
  this.infoDialog = this._createInfoDialog(ace);
  this.editDialog = this._createEditDialog(ace);
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
      buttons: [this._buildButton('edit', this._closeInfoDialogAndShowEditDialog.bind(this))],
    },
  };
  return dialog.create(configs);
};

textMarkInfoDialog.prototype._createEditDialog = function(ace) {
  // $content will be filled with data later, when dialog is opened
  var $emptyContent = $(`<div><div id="${this.editTextMarkFormId}"></div></div>`);
  var configs = {
    $content: $emptyContent,
    dialogTitleL10nKey: this.dialogTitleKey,
    ace: ace,
    targetType: this.targetType,
    // infoDialog handles the text marking
    targetAlreadyMarked: true,
    onSubmit: this._saveTextMark.bind(this),
    customClose: this._closeEditDialogAndShowInfoDialog.bind(this),
    doNotAnimate: true,
  };
  return dialog.create(configs);
};

textMarkInfoDialog.prototype._buildButton = function(key, action) {
  var self = this;
  return {
    text: key,
    // TODO: check if we need to add this translation ???
    'data-l10n-id': 'ep_script_touches.tag_occurrence_info.' + key,
    class: 'button--' + key,
    click: function(e) {
      var textMarkId = self.textMarkIdBeingDisplayed;
      action(textMarkId);
    },
  };
};

textMarkInfoDialog.prototype._saveTextMark = function($formContainer) {
  var textMarkId = this.textMarkIdBeingDisplayed;
  this.saveTextMark(textMarkId, $formContainer, this._closeEditDialogAndShowInfoDialog.bind(this));
};

textMarkInfoDialog.prototype._closeEditDialogAndShowInfoDialog = function() {
  var textMarkId = this.textMarkIdBeingDisplayed;
  this.showTextMarkInfoDialogForId(textMarkId, this.currentOwner);
  this.editDialog.close();
};

textMarkInfoDialog.prototype._closeInfoDialogAndShowEditDialog = function() {
  this._fillTextMarkContentOnEditDialog();
  this.editDialog.open();
  this.infoDialog.close();
};

textMarkInfoDialog.prototype.getCurrentOwner = function() {
  return this.currentOwner;
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

textMarkInfoDialog.prototype._fillTextMarkContentOnEditDialog = function() {
  this._fillTextMarkContent(this.editDialog, this.editTemplate.id, this.editTemplate.mainComponentSelector);
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
