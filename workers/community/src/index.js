import wasm from '@resvg/resvg-wasm/index_bg.wasm';
import font from '../assets/Inter-Bold.ttf';
import { createApp } from './app.js';
import { ensureCard, initCardRenderer } from './cards.js';

export default createApp({card:async(view,env)=>{
  await initCardRenderer(wasm);
  return ensureCard(view,env,font);
}});
