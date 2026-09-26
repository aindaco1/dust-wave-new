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
  // Keynote treats back from a completed build as "restart this slide".
  // With automatic builds that traps the viewer on the same slide. Wait for
  // a safe idle state, then select the previous actual slide instead.
  player = replaceKnown(player,
    'goBackToPreviousSlide(A){if(!this.script)return!1;if(this.script.showMode!==ng){var B=this.currentSceneIndex;switch(this.state){case tg:B+=1;case"Playing":case ig:var g,C=this.scriptManager.slideIndexFromSceneIndex(B),Q=this.scriptManager.sceneIndexFromSlideIndex(C);g=0===C?B>0?0:this.script.loopSlideshow?this.script.slideCount-1:0:-1===C&&B>0?this.script.slideCount-1:B>Q?this.currentSlideIndex:this.currentSlideIndex-1,this.jumpToSlide(g+1);break;default:null!==this.queuedUserAction&&void 0!==this.queuedUserAction||(this.queuedUserAction=this.goBackToPreviousSlide.bind(this,A))}}}',
    'goBackToPreviousSlide(A){if(!this.script)return!1;if(this.script.showMode!==ng){switch(this.state){case tg:case ig:if(this.currentSlideIndex===0&&!this.script.loopSlideshow)return;var g=this.currentSlideIndex>0?this.currentSlideIndex-1:this.script.slideCount-1;this.jumpToSlide(g+1);break;default:null!==this.queuedUserAction&&void 0!==this.queuedUserAction||(this.queuedUserAction=this.goBackToPreviousSlide.bind(this,A))}}}',
    'previous whole slide');
  for (const input of ['handleSwipeEvent', 'onMouseDown', 'onKeyPress']) {
    player = replaceKnown(player, `this.goBackToPreviousBuild("${input}")`,
      `this.goBackToPreviousSlide("${input}")`, `${input} backward navigation`,
      input === 'onMouseDown' ? 1 : 2);
  }
  player = replaceKnown(player,
    'B.swipeStartX&&B.swipeStartX<150',
    'B.swipeStartX!=null&&B.swipeStartX<24', 'swipe menu edge');
  player = replaceKnown(player,
    'handleContextMenuEvent(A){A.stopPropagation()}',
    'handleContextMenuEvent(A){A.stopPropagation(),A.preventDefault(),this.isRecording||this.goBackToPreviousSlide("handleContextMenuEvent")}',
    'right-click navigation');
  // Movies are slide content: no hover controls or native fullscreen takeover,
  // and pointer input must reach the presentation rather than pause the movie.
  // Normalize the later preload addition before checking the complete known
  // video constructor, so re-preparing an already patched export stays safe.
  player = player.replace('A.preload="auto",this.src.endsWith(".silent.mp4")&&(A.muted=!0,A.defaultMuted=!0),A.setAttribute("src",window.__pitchMedia?.source(this.src)||this.src),this.element=A}initWebVideo()',
    'A.setAttribute("src",this.src),this.element=A}initWebVideo()');
  player = replaceKnown(player,
    'initVideo(){const A=document.createElement("video");a(A,"0px","0px",this.width+"px",this.height+"px",Fg,null,"hidden"),E(A,"pointer-events","all"),A.setAttribute("id",this.movieId),A.setAttribute("src",this.src),this.showControls&&(A.addEventListener("mouseover",()=>{A.setAttribute("controls","controls")}),A.addEventListener("mouseleave",()=>{A.removeAttribute("controls")})),this.element=A}',
    'initVideo(){const A=document.createElement("video");a(A,"0px","0px",this.width+"px",this.height+"px",Fg,null,"hidden"),E(A,"pointer-events","none"),A.setAttribute("playsinline",""),A.setAttribute("tabindex","-1"),A.setAttribute("id",this.movieId),A.setAttribute("src",this.src),this.element=A}',
    'video interaction');
  player = replaceKnown(player,
    '"video"!==A.target.nodeName.toLowerCase()&&this.processClickOrTapAtDisplayCoOrds(C)',
    'this.processClickOrTapAtDisplayCoOrds(C)', 'video click navigation', 2);
  player = replaceKnown(player,
    'resetMovieCache(){for(var A in this.movieCache)delete this.movieCache[A].videoElement,delete this.movieCache[A];this.movieCache=null}',
    'resetMovieCache(){for(var A in this.movieCache)this.movieCache[A].stopMovie(),delete this.movieCache[A].videoElement,delete this.movieCache[A];this.movieCache=null}',
    'stop departed slide videos');
  // After a numbered jump, the submitted prompt must not swallow the next tap.
  player = replaceKnown(player,
    'this.jumpToSlide(this.digitAccumulator));break',
    'this.jumpToSlide(this.digitAccumulator)),this.hideAndResetSlideNumberController();break',
    'dismiss submitted slide number');
  // Opaque GIF conversions are silent inline movies; normal clips retain audio.
  player = replaceKnown(player,
    'A.setAttribute("src",this.src),this.element=A}initWebVideo()',
    'A.preload="auto",this.src.endsWith(".silent.mp4")&&(A.muted=!0,A.defaultMuted=!0),A.setAttribute("src",window.__pitchMedia?.source(this.src)||this.src),this.element=A}initWebVideo()',
    'streaming and prefetched movies');
  player = replaceKnown(player,
    'A.setAttribute("id",this.movieId),A.setAttribute("src",this.src)}observeEvents(A)',
    'A.setAttribute("id",this.movieId),A.setAttribute("src",window.__pitchMedia?.source(this.src)||this.src)}observeEvents(A)',
    'prefetched animated images');
  player = replaceKnown(player,
    'this.textureManager.loadScene(B)}unloadTextures()',
    'this.textureManager.loadScene(B);const C=this.currentSlideIndex+1;C<A.slideCount&&this.textureManager.loadScene(this.scriptManager.sceneIndexFromSlideIndex(C)),window.__pitchMedia?.warm(this.currentSlideIndex)}unloadTextures()',
    'preload next actual slide');
  return player;
}
