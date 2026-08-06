export type PlatformKey =
  | "steam"
  | "pc"
  | "android"
  | "switch"
  | "wiiu"
  | "wii"
  | "gamecube"
  | "n3ds"
  | "nds"
  | "gba"
  | "gbc"
  | "gb"
  | "n64"
  | "snes"
  | "famicom"
  | "nes"
  | "ps1"
  | "ps2"
  | "ps3"
  | "psp"
  | "psvita"
  | "dreamcast"
  | "genesis"
  | "gamegear"
  | "saturn"
  | "ngpc"
  | "arcade"
  | "retroarch"
  | "unknown";

export type PlatformInfo = {
  key: PlatformKey;
  name: string;
  shortName: string;
  color: string;
  background: string;
  glyph: string;
  assetUrl?: string;
  likelyEmulators: string[];
};

export const platforms: Record<PlatformKey, PlatformInfo> = {
  steam: {
    key: "steam",
    name: "Steam",
    shortName: "ST",
    color: "#66c0f4",
    background: "#10223f",
    glyph: "S",
    likelyEmulators: ["steam", "proton"],
  },
  pc: {
    key: "pc",
    name: "PC",
    shortName: "PC",
    color: "#35dff0",
    background: "#0b3944",
    glyph: "PC",
    likelyEmulators: ["wine", "proton", "heroic", "lutris"],
  },
  android: {
    key: "android",
    name: "Android",
    shortName: "AND",
    color: "#3ddc84",
    background: "#0b2f1e",
    glyph: "A",
    assetUrl: "/assets/platforms/android.png",
    likelyEmulators: ["android", "waydroid"],
  },
  switch: {
    key: "switch",
    name: "Nintendo Switch",
    shortName: "NS",
    color: "#e60012",
    background: "#3a060a",
    glyph: "NS",
    assetUrl: "/assets/platforms/switch.png",
    likelyEmulators: ["ryujinx", "yuzu", "sudachi", "citron"],
  },
  wiiu: {
    key: "wiiu",
    name: "Nintendo Wii U",
    shortName: "WU",
    color: "#00a8e8",
    background: "#06344d",
    glyph: "WU",
    assetUrl: "/assets/platforms/wiiu.png",
    likelyEmulators: ["cemu"],
  },
  wii: {
    key: "wii",
    name: "Nintendo Wii",
    shortName: "Wii",
    color: "#8b8f96",
    background: "#20242b",
    glyph: "Wii",
    assetUrl: "/assets/platforms/wii.png",
    likelyEmulators: ["dolphin"],
  },
  gamecube: {
    key: "gamecube",
    name: "Nintendo GameCube",
    shortName: "GC",
    color: "#6546b8",
    background: "#201039",
    glyph: "GC",
    assetUrl: "/assets/platforms/gamecube.png",
    likelyEmulators: ["dolphin"],
  },
  n3ds: {
    key: "n3ds",
    name: "Nintendo 3DS",
    shortName: "3DS",
    color: "#d12228",
    background: "#3a1116",
    glyph: "3D",
    assetUrl: "/assets/platforms/n3ds.png",
    likelyEmulators: ["citra", "lime3ds"],
  },
  nds: {
    key: "nds",
    name: "Nintendo DS",
    shortName: "NDS",
    color: "#f05a28",
    background: "#3a1b0c",
    glyph: "DS",
    assetUrl: "/assets/platforms/nds.png",
    likelyEmulators: ["melonds", "desmume"],
  },
  gba: {
    key: "gba",
    name: "Game Boy Advance",
    shortName: "GBA",
    color: "#7d5fff",
    background: "#1e163c",
    glyph: "GA",
    assetUrl: "/assets/platforms/gba.png",
    likelyEmulators: ["mgba", "retroarch"],
  },
  gbc: {
    key: "gbc",
    name: "Game Boy Color",
    shortName: "GBC",
    color: "#8f6cff",
    background: "#22153d",
    glyph: "GC",
    assetUrl: "/assets/platforms/gbc.png",
    likelyEmulators: ["mgba", "sameboy", "retroarch"],
  },
  gb: {
    key: "gb",
    name: "Game Boy",
    shortName: "GB",
    color: "#8bac0f",
    background: "#202f0b",
    glyph: "GB",
    assetUrl: "/assets/platforms/gb.png",
    likelyEmulators: ["mgba", "sameboy", "retroarch"],
  },
  n64: {
    key: "n64",
    name: "Nintendo 64",
    shortName: "N64",
    color: "#3aa757",
    background: "#0f2a17",
    glyph: "64",
    assetUrl: "/assets/platforms/n64.png",
    likelyEmulators: ["mupen64", "simple64", "retroarch"],
  },
  snes: {
    key: "snes",
    name: "Super Nintendo",
    shortName: "SNES",
    color: "#8f43ff",
    background: "#23113d",
    glyph: "SN",
    assetUrl: "/assets/platforms/snes.png",
    likelyEmulators: ["snes9x", "retroarch"],
  },
  famicom: {
    key: "famicom",
    name: "Famicom",
    shortName: "FC",
    color: "#d7342a",
    background: "#35100d",
    glyph: "FC",
    assetUrl: "/assets/platforms/famicom.png",
    likelyEmulators: ["mesen", "retroarch"],
  },
  nes: {
    key: "nes",
    name: "Nintendo Entertainment System",
    shortName: "NES",
    color: "#d7342a",
    background: "#35100d",
    glyph: "NE",
    assetUrl: "/assets/platforms/famicom.png",
    likelyEmulators: ["mesen", "retroarch"],
  },
  ps1: {
    key: "ps1",
    name: "PlayStation",
    shortName: "PS1",
    color: "#2e6bdc",
    background: "#0d1b3a",
    glyph: "PS",
    assetUrl: "/assets/platforms/ps1.png",
    likelyEmulators: ["duckstation", "swanstation", "retroarch"],
  },
  ps2: {
    key: "ps2",
    name: "PlayStation 2",
    shortName: "PS2",
    color: "#2451ff",
    background: "#0b1136",
    glyph: "P2",
    assetUrl: "/assets/platforms/ps2.png",
    likelyEmulators: ["pcsx2"],
  },
  ps3: {
    key: "ps3",
    name: "PlayStation 3",
    shortName: "PS3",
    color: "#0f1118",
    background: "#090b12",
    glyph: "P3",
    likelyEmulators: ["rpcs3"],
  },
  psp: {
    key: "psp",
    name: "PlayStation Portable",
    shortName: "PSP",
    color: "#2f73ff",
    background: "#10193c",
    glyph: "PP",
    assetUrl: "/assets/platforms/psp.png",
    likelyEmulators: ["ppsspp"],
  },
  psvita: {
    key: "psvita",
    name: "PlayStation Vita",
    shortName: "Vita",
    color: "#2f73ff",
    background: "#10193c",
    glyph: "PV",
    assetUrl: "/assets/platforms/psvita.png",
    likelyEmulators: ["vita3k"],
  },
  dreamcast: {
    key: "dreamcast",
    name: "Sega Dreamcast",
    shortName: "DC",
    color: "#f06b23",
    background: "#3a1908",
    glyph: "DC",
    assetUrl: "/assets/platforms/dreamcast.png",
    likelyEmulators: ["flycast", "redream"],
  },
  genesis: {
    key: "genesis",
    name: "Sega Genesis",
    shortName: "GEN",
    color: "#0f7bff",
    background: "#0b1d35",
    glyph: "SG",
    assetUrl: "/assets/platforms/genesis.png",
    likelyEmulators: ["genesis", "blastem", "retroarch"],
  },
  gamegear: {
    key: "gamegear",
    name: "Sega Game Gear",
    shortName: "GG",
    color: "#0f7bff",
    background: "#0b1d35",
    glyph: "GG",
    assetUrl: "/assets/platforms/gamegear.png",
    likelyEmulators: ["gearsystem", "retroarch"],
  },
  saturn: {
    key: "saturn",
    name: "Sega Saturn",
    shortName: "SAT",
    color: "#2e5cff",
    background: "#101943",
    glyph: "SS",
    assetUrl: "/assets/platforms/saturn.png",
    likelyEmulators: ["yabasanshiro", "mednafen", "retroarch"],
  },
  ngpc: {
    key: "ngpc",
    name: "Neo Geo Pocket Color",
    shortName: "NGPC",
    color: "#38d5ff",
    background: "#0b2733",
    glyph: "NG",
    assetUrl: "/assets/platforms/ngpc.png",
    likelyEmulators: ["mednafen", "retroarch"],
  },
  arcade: {
    key: "arcade",
    name: "Arcade",
    shortName: "ARC",
    color: "#ffb000",
    background: "#332000",
    glyph: "AR",
    likelyEmulators: ["mame", "fbneo", "supermodel", "model2"],
  },
  retroarch: {
    key: "retroarch",
    name: "RetroArch",
    shortName: "RA",
    color: "#f2f2f2",
    background: "#171a22",
    glyph: "RA",
    likelyEmulators: ["retroarch"],
  },
  unknown: {
    key: "unknown",
    name: "Plataforma desconocida",
    shortName: "??",
    color: "#35dff0",
    background: "#111827",
    glyph: "SN",
    likelyEmulators: [],
  },
};

export function inferPlatformKey(input: string): PlatformKey {
  const value = input.toLowerCase();

  if (/(android|waydroid|\.apk)/.test(value)) return "android";
  if (/(ryujinx|yuzu|sudachi|citron|switch|\.nsp|\.xci)/.test(value)) return "switch";
  if (/(cemu|wii u|wiiu|\.wux|\.wud)/.test(value)) return "wiiu";
  if (/(dolphin|gamecube|game cube|\.gcm|\.rvz)/.test(value)) return "gamecube";
  if (/(wii|\.wbfs)/.test(value)) return "wii";
  if (/(citra|lime3ds|3ds|\.3ds|\.cia)/.test(value)) return "n3ds";
  if (/(melonds|desmume|nds|\.nds)/.test(value)) return "nds";
  if (/(mgba|gba|\.gba)/.test(value)) return "gba";
  if (/(game boy color|gameboy color|gbc|\.gbc)/.test(value)) return "gbc";
  if (/(game boy|gameboy|\.gb)/.test(value)) return "gb";
  if (/(mupen|simple64|n64|\.z64|\.v64|\.n64)/.test(value)) return "n64";
  if (/(snes|super nintendo|sfc|\.sfc|\.smc)/.test(value)) return "snes";
  if (/(famicom|family computer)/.test(value)) return "famicom";
  if (/(nes|famicom|\.nes)/.test(value)) return "nes";
  if (/(pcsx2|playstation 2|ps2)/.test(value)) return "ps2";
  if (/(rpcs3|playstation 3|ps3)/.test(value)) return "ps3";
  if (/(vita3k|playstation vita|ps vita|psvita|\.vpk)/.test(value)) return "psvita";
  if (/(ppsspp|playstation portable|psp|\.cso)/.test(value)) return "psp";
  if (/(duckstation|swanstation|playstation|psx|ps1|\.cue|\.chd)/.test(value)) return "ps1";
  if (/(flycast|redream|dreamcast)/.test(value)) return "dreamcast";
  if (/(game gear|gamegear|gearsystem|\.gg)/.test(value)) return "gamegear";
  if (/(genesis|megadrive|mega drive|sega mega drive)/.test(value)) return "genesis";
  if (/(saturn|yabasanshiro)/.test(value)) return "saturn";
  if (/(neo geo pocket color|neo geo pocket|ngpc|\.ngc|\.ngp)/.test(value)) return "ngpc";
  if (/(mame|fbneo|arcade|supermodel|model2)/.test(value)) return "arcade";
  if (/(retroarch|libretro)/.test(value)) return "retroarch";
  if (/(steam|proton)/.test(value)) return "steam";
  if (/(heroic|lutris|wine|pc)/.test(value)) return "pc";
  return "unknown";
}

export function getPlatformInfo(input: string) {
  return platforms[inferPlatformKey(input)];
}
