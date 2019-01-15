var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var utils = require('./utils');
var commentL10n = require('./commentL10n');
var preTextMarker = require('./preTextMarker');

// make sure jqueryui/dialog and $.tmpl are loaded
require('./lib/jquery.tmpl.min');
require('./lib/jquery-ui.min');

var DO_NOTHING = function(){};

/*
   Possible values for `config`:
     - ace: [mandatory] reference to the `ace` object
     - $content: [mandatory] jQuery reference to the root element to be displayed on the dialog
     - dialogTitleL10nKey: [mandatory] l10n key on locales/*.json to use as dialog title
     - targetType: used to mark selected text when opening & closing the dialog
     - dialogOpts: options to overwrite default options used by this component. Can be any of
                   those described on https://api.jqueryui.com/dialog
     - targetAlreadyMarked: flag to avoid text to be marked/unmarked when dialog is
                            opened/closed. Useful when 2 dialogs handle the same targetType, or
                            when the reference to position the dialog is provided by
                            getElementOnPadOuterForDialogPosition or
                            getElementOnPadInnerForDialogPosition (see below)
     - getElementOnPadOuterForDialogPosition: returns the element to be used as reference on
                                              padOuter when positioning the dialog. If provided,
                                              positions the dialog at the same position of the
                                              returned value. Otherwise positions the dialog below
                                              the element returned by
                                              getElementOnPadInnerForDialogPosition().
     - getElementOnPadInnerForDialogPosition: returns the element to be used as reference on
                                              padInner when positioning the dialog.
                                              Default: use the selected text
     - onSubmit: function to be called when user submits the form on $content (if any)
     - beforeOpen: function to be called when user requests dialog to be opened
     - customClose: function to be called when user closes the dialog
     - doNotAnimate: flag to animate or not dialog opening & closing. Default: false
     - openWithinViewport: flag to allow dialog to be opened always inside the viewport. If
                           this flag is true, no scroll is made after opening dialog.
                           Default: false
*/
var dialog = function(config) {
  this.textMarker = preTextMarker.createForTarget(config.targetType, config.ace);
  this.$content = config.$content;
  this.onSubmit = config.onSubmit || DO_NOTHING;
  this.beforeOpen = config.beforeOpen || DO_NOTHING;
  this.ace = config.ace;
  this.shouldMarkText = !config.targetAlreadyMarked;
  this.openWithinViewport = config.openWithinViewport;
  this.scrollAfterOpeningDialog = !config.openWithinViewport;
  this._getElementOnPadOuterForDialogPosition = config.getElementOnPadOuterForDialogPosition || this._createShadowOnPadOuterOfElementOnPadInner;
  this._getElementOnPadInnerForDialogPosition = config.getElementOnPadInnerForDialogPosition || this._getSelectedText;
  this.placeDialogBelowReference = !config.getElementOnPadOuterForDialogPosition;

  this._buildWidget(config);

  // When language is changed, we need to be localized too
  var self = this;
  html10n.bind('localized', function() {
    self._localizeDialogContent();
  });
}

dialog.prototype._buildWidget = function(config) {
  var closeDialog = config.customClose || this.close.bind(this);
  var $container = utils.getPadOuter().find('body');
  this.$content.appendTo($container);

  var defaultDialogOpts = {
    autoOpen: false,
    resizable: false,
    close: closeDialog,
    classes: {
      'ui-dialog': 'ui-dialog--' + config.targetType,
    },
  };

  var animationConfigs = {
    effect: 'drop',
    duration: 500,
  };
  var defaultAnimationOpts = config.doNotAnimate ? {} : {
    show: animationConfigs,
    hide: animationConfigs,
  };

  var opts = Object.assign({}, defaultDialogOpts, defaultAnimationOpts, (config.dialogOpts || {}));
  this.$content.dialog(opts);

  this.widget = this.$content.dialog('widget');
  this._customizeCloseButton();
  this._customizeDialogTitle(config.dialogTitleL10nKey);
  this._localizeDialogContent();
}

dialog.prototype._customizeCloseButton = function() {
  var $customizedCloseButton = $('#closeButton').tmpl();
  var $originalCloseButton = this.widget.find('.ui-dialog-titlebar-close');

  // the close button of $.dialog() cannot be customized as needed, so override it
  $originalCloseButton.html($customizedCloseButton.html());

  // enable l10n of close button (same label for all dialogs)
  $originalCloseButton.attr('data-l10n-id', 'ep_comments_page.comments_template.close.title');
}

dialog.prototype._customizeDialogTitle = function(l10nTitle) {
  // enable l10n of dialog title
  var $dialogTitle = this.widget.find('.ui-dialog-title');
  $dialogTitle.attr('data-l10n-id', l10nTitle);
}

dialog.prototype._localizeDialogContent = function() {
  commentL10n.localize(this.widget);
}

dialog.prototype.open = function(aceContext, callbackOnSubmit) {
  callbackOnSubmit = callbackOnSubmit || DO_NOTHING;
  var self = this;

  // Detach current "submit" handler to be able to call the updated callbackOnSubmit
  this.$content.off("submit").submit(function() {
    var $form = $(this);

    self.ace.callWithAce(function(ace) {
      var preMarkedTextSelector = self.textMarker.getMarkerSelector();
      var preMarkedTextRepArr = ace.ace_getRepFromSelector(preMarkedTextSelector);
      self.onSubmit($form, preMarkedTextRepArr, callbackOnSubmit);
    });

    // don't submit the form, we don't want Etherpad page to be reloaded
    return false;
  });

  // mark selected text, so it is clear to user which text range the dialog is being applied to
  if (this.shouldMarkText) {
    this.textMarker.markSelectedText(aceContext);
  }

  this._localizeDialogContent();
  this._resetForm();
  this.beforeOpen();
  this._openDialog();

  if (this.scrollAfterOpeningDialog) {
    this._smoothlyScrollEditorToMakeDialogFullyVisible();
  }
}

dialog.prototype._resetForm = function() {
  // if there's any form on the dialog, reset it
  this.widget.find('form').each(function() {
    this.reset();
  })
}

dialog.prototype._openDialog = function() {
  var $referenceOnPadOuter = this._getElementOnPadOuterForDialogPosition();
  var configs = this.placeDialogBelowReference ?
                this._configsToOpenDialogBelow($referenceOnPadOuter) :
                this._configsToOpenDialogAtSamePositionOf($referenceOnPadOuter);
  this._openDialogWithConfigs(configs);
  this._cleanupReferenceElementOnPadOuter();
}
dialog.prototype._configsToOpenDialogAtSamePositionOf = function($reference) {
  return {
    my: 'left top',
    at: 'left top',
    of: $reference,
  }
}
dialog.prototype._configsToOpenDialogBelow = function($reference) {
  return {
    my: 'left top',
    at: 'left bottom+3',
    of: $reference,
  }
}
dialog.prototype._openDialogWithConfigs = function(customConfigs) {
  // make sure dialog positioning takes into account the amount of scroll editor has
  var withinConfig  = this.openWithinViewport ? utils.getOuterWindow() : utils.getPadOuter();
  var configs = Object.assign({}, { within: withinConfig }, customConfigs);

  this.$content.dialog('option', 'position', configs).dialog('open');
}

// create an element on the exact same position of the element provided by
// getElementOnPadInnerForDialogPosition(). Use it as reference to display dialog later
dialog.prototype._createShadowOnPadOuterOfElementOnPadInner = function() {
  var $referenceText = this._getElementOnPadInnerForDialogPosition();

  // there might have multiple <span>'s on reference text (ex: if text has bold in the middle of it)
  var beginningOfReferenceText = $referenceText.first().get(0).getBoundingClientRect();
  var endingOfReferenceText    = $referenceText.last().get(0).getBoundingClientRect();

  var topOfReferenceText    = beginningOfReferenceText.top;
  var bottomOfReferenceText = endingOfReferenceText.bottom;
  var leftOfReferenceText   = Math.min(beginningOfReferenceText.left, endingOfReferenceText.left);
  var rightOfReferenceText  = Math.max(beginningOfReferenceText.right, endingOfReferenceText.right);

  // get "shadow" position
  var editor = utils.getPadOuter().find('iframe[name="ace_inner"]').offset();
  var $shadow = $('<span id="shadow"></span>');
  $shadow.css({
    top: editor.top + topOfReferenceText,
    left: editor.left + leftOfReferenceText,
    width: rightOfReferenceText - leftOfReferenceText,
    height: bottomOfReferenceText - topOfReferenceText,
    position: 'absolute',
  });

  var $container = utils.getPadOuter().find('body');
  $shadow.appendTo($container);

  return $shadow;
}

dialog.prototype._cleanupReferenceElementOnPadOuter = function() {
  // if a shadow element was created, remove it. Otherwise ignore
  utils.getPadOuter().find('#shadow').remove();
}

dialog.prototype._getSelectedText = function() {
  var selector = this.textMarker.getMarkerSelector();
  var $selectedText = utils.getPadInner().find(selector);

  // when multiple lines are selected, use first one as reference to create the shadow
  var lineAtBeginningOfSelection = $selectedText.first().closest('div').get(0);
  var lineAtEndOfSelection = $selectedText.last().closest('div').get(0);
  if (lineAtBeginningOfSelection !== lineAtEndOfSelection) {
    $selectedText = $selectedText.first();
  }

  return $selectedText;
}

dialog.prototype._focusOnContainer = function() {
  this.$content.focus();

  // fix for iOS: when opening the dialog, we need to force focus on padOuter
  // contentWindow, otherwise keyboard will be displayed but text input made by
  // the user won't be added to $content
  var outerWindow = utils.getOuterWindow();
  if (outerWindow) {
    outerWindow.focus();
  }
}

dialog.prototype._smoothlyScrollEditorToMakeDialogFullyVisible = function() {
  var self = this;

  utils.getOuterWindow().scrollIntoView(self.$content.get(0), function() {
    // Allow user to start typing an input right away
    self._focusOnContainer();
  });
}

dialog.prototype.isOpen = function() {
  return this.$content.dialog('isOpen');
}

dialog.prototype.close = function() {
  this.$content.dialog('close');

  // de-select text when dialog is closed
  if (this.shouldMarkText) {
    this.textMarker.unmarkSelectedText();
  }
}

exports.create = function(config) {
  return new dialog(config);
}
