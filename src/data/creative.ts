export type CreativeMedia = {
  kind: "screenshot" | "audio" | "video" | "device-preview";
  label: string;
  description: string;
  src?: string;
};

export type CreativeLink = {
  label: string;
  href: string;
};

export type CreativeProject = {
  name: string;
  category: string;
  description: string;
  platform: string;
  status: string;
  media: CreativeMedia[];
  links: CreativeLink[];
};

export const creativeProjects: CreativeProject[] = [
  {
    name: "Max for Live devices",
    category: "Music devices",
    description: "Purposeful devices for performance, composition, and happy accidents.",
    platform: "Ableton Live",
    status: "In progress",
    media: [
      {
        kind: "device-preview",
        label: "Device previews",
        description: "Future device previews and in-context Ableton Live screenshots will live here.",
      },
    ],
    links: [],
  },
  {
    name: "Experimental music tools",
    category: "Software studies",
    description: "Small software studies for sound, rhythm, and the spaces between.",
    platform: "Various platforms",
    status: "In exploration",
    media: [
      {
        kind: "audio",
        label: "Listening studies",
        description: "Future audio demonstrations, moving images, and process notes will live here.",
      },
    ],
    links: [],
  },
];
