var TextMarksFinder = require('./textMarksFinder');

self.addEventListener('message', function(event) {
    var finder = new TextMarksFinder(event.data);
    var result = finder.perform();
    self.postMessage({
      textMarksOccurrences: result,
      lineOfChange: event.data.lineOfChange,
    });
  },
  false
);
