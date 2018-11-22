var readOnlyManager = require('ep_etherpad-lite/node/db/ReadOnlyManager.js');

exports.getReadWritePadId = function(padId) {
  var isReadOnly = padId.indexOf('r.') === 0;
  if (isReadOnly) {
    readOnlyManager.getPadId(padId, function(err, rwPadId) {
      padId = rwPadId;
    });
  };
  return padId;
}
