export interface LaunchSite {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  /** WGS84 ellipsoidal height (geoid + terrain) for 3D Tiles placement. */
  ellipsoidHeight: number;
  /** Extra vertical offset (metres) to align the pad with the 3D Tiles ground.
   *  Negative = push pad down (tiles ground is lower than the nominal height). */
  padOffsetY?: number;
  description: string;
  terrain: "coastal" | "steppe" | "jungle" | "island";
}

export const LAUNCH_SITES: LaunchSite[] = [
  // ellipsoidHeight: WGS84 height that places the scene origin at ground level.
  // Floating pad → height too HIGH (terrain below origin) → decrease it.
  // Underground pad → height too LOW (terrain above origin) → increase it.
  // padOffsetY is unused now (kept for future fine-tuning).
  { id: "canaveral", name: "Cape Canaveral", country: "🇺🇸 USA", lat: 28.3922, lon: -80.6077, ellipsoidHeight: -24, terrain: "coastal", description: "Where the Moon missions launched" },
  { id: "starbase", name: "Starbase, Texas", country: "🇺🇸 USA", lat: 25.9972, lon: -97.156, ellipsoidHeight: -23, terrain: "coastal", description: "Home of the biggest rocket ever built" },
  { id: "baikonur", name: "Baikonur Cosmodrome", country: "🇰🇿 Kazakhstan", lat: 45.9646, lon: 63.3052, ellipsoidHeight: 106, terrain: "steppe", description: "The world's first and busiest spaceport" },
  { id: "kourou", name: "Guiana Space Centre", country: "🇬🇫 French Guiana", lat: 5.236, lon: -52.7686, ellipsoidHeight: 17, terrain: "jungle", description: "Near the equator — rockets get a free speed boost" },
  { id: "tanegashima", name: "Tanegashima", country: "🇯🇵 Japan", lat: 30.4008, lon: 130.9686, ellipsoidHeight: 48, terrain: "island", description: "Called the most beautiful launch site on Earth" },
  { id: "vandenberg", name: "Vandenberg", country: "🇺🇸 USA", lat: 34.742, lon: -120.5724, ellipsoidHeight: 18, terrain: "coastal", description: "Launches rockets out over the Pacific" },
  { id: "saxavord", name: "SaxaVord, Shetland", country: "🇬🇧 UK", lat: 60.8167, lon: -0.7667, ellipsoidHeight: 105, terrain: "island", description: "Britain's own spaceport — closest to home!" },
];

export const SITE_BY_ID: Record<string, LaunchSite> = Object.fromEntries(LAUNCH_SITES.map((s) => [s.id, s]));

/** Stylised ground colours per terrain tag (offline fallback for 3D tiles). */
export const TERRAIN_COLORS: Record<LaunchSite["terrain"], { ground: string; horizon: string }> = {
  coastal: { ground: "#8a9a6b", horizon: "#2f6f8f" },
  steppe: { ground: "#b8a35f", horizon: "#8f8250" },
  jungle: { ground: "#3f7a44", horizon: "#2e5d3a" },
  island: { ground: "#6f8f5f", horizon: "#3a6f8f" },
};