// Keep changes narrow and fail closed if a future Keynote export changes these seams.
function replaceKnown(source, before, after, label, patchedOccurrences = 1) {
  const occurrences = source.split(before).length - 1;
  if (occurrences === 1) return source.replace(before, after);
  if (occurrences === 0 && source.split(after).length === patchedOccurrences + 1) return source;
  throw new Error(`Unknown Keynote player: review the ${label} patch before publishing.`);
}

export function patchKeynotePlayer(source) {
  let player = replaceKnown(source,
    'const B=this.usableDisplayHeight;UC.isFullscreen||A>this.showWidth&&(A=this.showWidth);const g=function',
    'const B=this.usableDisplayHeight;const g=function', 'viewport sizing');
  // Normal viewer gestures advance a whole slide. Keynote's internal automatic
  // build progression remains untouched so all nested GIF starts still run.
  for (const input of ['processClickOrTapAtDisplayCoOrds', 'handleSwipeEvent', 'onMouseDown', 'onKeyPress']) {
    player = replaceKnown(player, `this.advanceToNextBuild("${input}")`,
      `this.advanceToNextSlide("${input}")`, `${input} navigation`,
      ['handleSwipeEvent', 'onKeyPress'].includes(input) ? 2 : 1);
  }
  player = replaceKnown(player,
    'this.resetMediaCache(),null==B&&(B=!1),this.jumpToScene(C,B)',
    'this.resetMediaCache(),null==B&&(B=!!this.script.events[C].automaticPlay),this.jumpToScene(C,B)',
    'selected slide autoplay');
  return player;
}
