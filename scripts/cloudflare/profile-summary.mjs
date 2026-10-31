/** Local diagnostic samples only: never provider CPU accounting or request data. */
const sourceCategories = new Set(['operator-wrapper','next-server-renderer-and-route-loader','authkit-edge-middleware','opennext-middleware-router','request-boundary','opennext-dispatch','other-mapped-application','native-runtime-or-unmapped']);
export function summarizeProfile(profile, sourceCategory) {
  const nodes = new Map((profile.nodes ?? []).map(node => [node.id, node.callFrame]));
  const frames = new Map();
  let activeUs = 0;
  let unattributedUs = 0;
  let invalidSamples = 0;
  const categories = new Map();
  for (const [index, id] of (profile.samples ?? []).entries()) {
    const frame = nodes.get(id);
    const delta = profile.timeDeltas?.[index];
    if (!frame || typeof delta !== 'number' || !Number.isFinite(delta) || delta < 0) { invalidSamples++; continue; }
    if (frame.functionName === '(idle)') continue;
    activeUs += delta;
    const category = sourceCategory?.(frame);
    if (sourceCategories.has(category)) categories.set(category, (categories.get(category) ?? 0) + delta);
    if (!frame.functionName || ['(root)', '(program)'].includes(frame.functionName)) { unattributedUs += delta; continue; }
    // Never export a CDP URL: it can contain inline source or private paths.
    const name = frame.functionName.slice(0, 96);
    const line = Number.isSafeInteger(frame.lineNumber) ? frame.lineNumber : -1;
    const key = name + ':' + line;
    const entry = frames.get(key) ?? { functionName: name, generatedLine: line, samples: 0, selfSampleUs: 0 };
    entry.samples++; entry.selfSampleUs += delta; frames.set(key, entry);
  }
  return {
    activeSampleMs: +(activeUs / 1000).toFixed(3),
    unattributedSampleMs: +(unattributedUs / 1000).toFixed(3),
    invalidSamples,
    ...(sourceCategory ? { sourceSamples: [...categories].map(([category, us]) => ({category, selfSampleMs: +(us / 1000).toFixed(3)})) } : {}),
    // Attribution includes profiler/event-loop scheduling. No optimization or
    // Free-plan claim follows from these numbers alone.
    frames: [...frames.values()].sort((a,b) => b.selfSampleUs-a.selfSampleUs).slice(0,12)
      .map(({selfSampleUs,...frame}) => ({...frame,selfSampleMs:+(selfSampleUs/1000).toFixed(3)})),
  };
}
