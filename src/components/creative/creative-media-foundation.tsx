import type { CreativeMedia } from "@/data/creative";

const mediaLabels: Record<CreativeMedia["kind"], string> = {
  screenshot: "Screenshots",
  audio: "Audio demos",
  video: "Videos",
  "device-preview": "Device previews",
};

export function CreativeMediaFoundation({ media }: { media: CreativeMedia[] }) {
  return <div className="grid border-l border-t border-[color:var(--color-line)] sm:grid-cols-2">{media.map((item) => <article key={`${item.kind}-${item.label}`} className="flex min-h-56 flex-col justify-between border-b border-r border-[color:var(--color-line)] p-6 sm:min-h-72 sm:p-8"><p className="type-metadata">{mediaLabels[item.kind]}</p><div><h2 className="text-2xl font-medium tracking-[-0.04em]">{item.label}</h2><p className="type-body mt-3 max-w-sm leading-7">{item.description}</p></div></article>)}</div>;
}
