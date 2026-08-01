export function buildVideoContent({ script, scenes, prompt }) {
  if ((!script || !String(script).trim()) && (!scenes || scenes.length === 0)) {
    return null;
  }
  return {
    script: (script && String(script).trim()) ? script : null,
    scenes: (scenes && scenes.length > 0) ? scenes : null,
  };
}
