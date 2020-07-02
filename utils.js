var readOnlyManager = require('ep_etherpad-lite/node/db/ReadOnlyManager.js');

exports.getReadWritePadId = async function(padId) {
  var thisPadId = padId;
  var isReadOnly = padId.indexOf('r.') === 0;
  if (isReadOnly) {
    thisPadId = await readOnlyManager.getPadId(padId);
  };
  return thisPadId;
}
