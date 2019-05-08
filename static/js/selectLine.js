exports.selectLineIfThereIsNoTextSelected = function(editorInfo, rep, lineNumber) {
  var beginningOfLine = getFirstPositionOfLine(lineNumber, rep);
  var endOfLine = getLastPositionOfLine(lineNumber, rep);
  var isLineEmpty = lineIsEmpty(lineNumber, rep);
  var lineIsInsideOfSelection = lineClickedIsInsideOfSelection(lineNumber, rep);
  if (!lineIsInsideOfSelection && !isLineEmpty) {
    editorInfo.ace_inCallStack('thisEventWillNotBeCaptured', function(){
      editorInfo.ace_performSelectionChange(beginningOfLine, endOfLine, true);
      editorInfo.ace_updateBrowserSelectionFromRep();
    });
  }
}

var getFirstPositionOfLine = function(lineNumber, rep) {
  var line = rep.lines.atIndex(lineNumber);
  var firstCharPosition = line.lineMarker ? 1 : 0;
  return [lineNumber, firstCharPosition];
}

var getLastPositionOfLine = function(line, rep) {
  var lineLength = getLength(line, rep);
  return [line, lineLength];
}

var lineIsEmpty = function(caretLine, rep){
  var line = rep.lines.atIndex(caretLine);
  var emptyLineLength = line.lineMarker ? 1 : 0;

  return line.text.length === emptyLineLength;
}

var lineClickedIsInsideOfSelection = function(line, rep) {
  var selection = hasSelection(rep);
  var beginningOfSelection = rep.selStart[0];
  var endOfSelection = rep.selEnd[0];
  var lineIsInOfSelection = beginningOfSelection <= line && endOfSelection >= line;

  return selection && lineIsInOfSelection;
}

var hasSelection = function(rep) {
  var differentlinesSelected = rep.selStart[0] !== rep.selEnd[0];
  var differentcolumnsSelected = rep.selStart[1] !== rep.selEnd[1];

  return differentlinesSelected || differentcolumnsSelected;
}

var getLength = function(line, rep) {
  var nextLine = line + 1;
  var startLineOffset = rep.lines.offsetOfIndex(line);
  var endLineOffset   = rep.lines.offsetOfIndex(nextLine);

  //lineLength without \n
  var lineLength = endLineOffset - startLineOffset - 1;

  return lineLength;
}
