var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var commentL10n = require('ep_comments_page/static/js/commentL10n');

// Easier access to outer pad
var padOuter;
var getPadOuter = function() {
  padOuter = padOuter || $('iframe[name="ace_outer"]').contents();
  return padOuter;
}

// Easier access to new comment container
var newCommentContainer;
var getNewCommentContainer = function() {
  newCommentContainer = newCommentContainer || getPadOuter().find('#newComments');
  return newCommentContainer;
}

// Insert a comment node
var createNewCommentForm = function(comment) {
  var container = getNewCommentContainer();

  comment.commentId = "";
  var content = $('#newCommentTemplate').tmpl(comment);
  content.prependTo(container);

  return content;
};

// Create a comment object with data filled on the given form
var buildCommentFrom = function(form) {
  var text       = form.find('.comment-content').val();
  var changeFrom = form.find('.comment-suggest-from').val();
  var changeTo   = form.find('.comment-suggest-to').val() || null;
  var comment    = {};

  comment.text = text;
  if(changeTo){
    comment.changeFrom = changeFrom;
    comment.changeTo = changeTo;
  }

  return comment;
}

// Callback for new comment Cancel
var cancelNewComment = function(){
  hideNewCommentForm();
}

// Callback for new comment Submit
var submitNewComment = function(form, callback) {
  var index = 0;
  var text = form.find('.comment-content').val();
  var commentTextIsNotEmpty = text.length !== 0;
  var comment = buildCommentFrom(form);
  if (commentTextIsNotEmpty) {
    hideNewCommentForm();
    callback(comment, index);
  }
  return false;
}

/* ***** Public methods: ***** */

var localizeNewCommentForm = function() {
  var newCommentForm = getNewCommentContainer().find('#newComment');
  if (newCommentForm.length !== 0) commentL10n.localize(newCommentForm);
};

// Create container to hold new comment form
var insertContainers = function(target) {
  target.prepend('<div id="newComments"></div>');

  // Listen for include suggested change toggle
  getNewCommentContainer().on("change", '#suggestion-checkbox', function() {
    if($(this).is(':checked')) {
      getPadOuter().find('.suggestion').show();
    } else {
      getPadOuter().find('.suggestion').hide();
    }
  });
}

// Insert new Comment Form
var insertNewCommentFormIfDontExist = function(comment, callback) {
  var newCommentForm = getNewCommentContainer().find('#newComment');
  var formDoesNotExist = newCommentForm.length === 0;
  if (formDoesNotExist) {
    newCommentForm = createNewCommentForm(comment);
    localizeNewCommentForm();

    // Listen to cancel
    newCommentForm.find('#comment-reset').on('click', function() {
      cancelNewComment();
    });
  } else {
    // Reset form to make sure it is all clear
    newCommentForm.get(0).reset();
    newCommentForm.find('.suggestion').hide();

    // Detach current "submit" handler to be able to call the updated callback
    newCommentForm.off("submit");
  }

  // Listen to comment confirmation
  newCommentForm.submit(function() {
    var form = $(this);
    return submitNewComment(form, callback);
  });

  return newCommentForm;
};

var placeFocusOnCommentField = function() {
  // Adjust focus on the form
  getNewCommentContainer().find(".comment-content").focus();

  // fix for iOS: when opening #newComment, we need to force focus on padOuter
  // contentWindow, otherwise keyboard will be displayed but text input made by
  // the user won't be added to textarea
  var outerIframe = $('iframe[name="ace_outer"]').get(0);
  if (outerIframe && outerIframe.contentWindow) {
    outerIframe.contentWindow.focus();
  }
}

var showNewCommentFormAt = function(top) {
  adjustNewCommentFormPositionTo(top);

  getNewCommentContainer().addClass("active");
  // we need to set a timeout otherwise the animation to show #newComment won't be visible
  window.setTimeout(function() {
    getNewCommentContainer().find('#newComment').removeClass("hidden").addClass("visible");
    // we need to give some time for the animation of #newComment to finish
    window.setTimeout(function() {
      placeFocusOnCommentField();
    }, 500);
  }, 0);
}

var hideNewCommentForm = function() {
  getNewCommentContainer().find('#newComment').removeClass("visible").addClass("hidden");

  // force focus to be lost, so virtual keyboard is hidden on mobile devices
  getNewCommentContainer().find(':focus').blur();

  // we need to give some time for the animation of #newComment to finish
  window.setTimeout(function() {
    getNewCommentContainer().removeClass("active");
  }, 500);
}

var adjustNewCommentFormPositionTo = function(top) {
  // Desktop and Android platform don't need to change #newComments position in order
  // to align the form to the selected text
  if (browser.ios) {
    getNewCommentContainer().css('top', top);
  }
}

exports.localizeNewCommentForm = localizeNewCommentForm;
exports.insertContainers = insertContainers;
exports.insertNewCommentFormIfDontExist = insertNewCommentFormIfDontExist;
exports.placeFocusOnCommentField = placeFocusOnCommentField;
exports.showNewCommentFormAt = showNewCommentFormAt;
exports.hideNewCommentForm = hideNewCommentForm;
exports.adjustNewCommentFormPositionTo = adjustNewCommentFormPositionTo;
