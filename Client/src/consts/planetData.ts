import { PlanetData } from "../types/PlanetData";

export const planetData: PlanetData[] = [
  {
    name: "Sun",
    radius: 696340,
    color: "#ffd700",
    mass: 1.989e30,
    scale: 1,
    texture: "2k_sun.jpg",
    dayLength: 609.6  // Sun rotates once every ~25.4 days (in hours)
  },
  {
    name: "Mercury",
    radius: 2439.7,
    color: "#A0522D",
    mass: 3.285e23,
    scale: 1,
    texture: "2k_mercury.jpg",
    dayLength: 4222.6  // Mercury's sidereal day is ~58.6 Earth days (in hours)
  },
  {
    name: "Venus",
    radius: 6051.8,
    color: "#DEB887",
    mass: 4.867e24,
    scale: 1,
    texture: "2k_venus_surface.jpg",
    dayLength: 5832.5  // Venus rotates once every 243 Earth days (in hours)
  },
  {
    name: "Earth",
    radius: 6371,
    color: "#4287f5",
    mass: 5.972e24,
    scale: 1,
    texture:
      "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg",
    dayLength: 24.0  // Earth's sidereal day is ~23.93 hours
  },
  {
    name: "Moon",
    radius: 1737,
    color: "#808080",
    mass: 7.348e22,
    scale: 1,
    texture:
      "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/moon_1024.jpg",
    dayLength: 708.7  // Moon's sidereal rotation period is ~27.3 Earth days (in hours)
  },
  {
    name: "Mars",
    radius: 3390,
    color: "#ff0000",
    mass: 6.417e23,
    scale: 1,
    texture: "2k_mars.jpg",
    dayLength: 24.7  // Mars' day is 24 hours 37 minutes
  },
  {
    name: "Jupiter",
    radius: 69911,
    color: "#DEB887",
    mass: 1.898e27,
    scale: 1,
    texture: "2k_jupiter.jpg",
    dayLength: 9.9  // Jupiter's day is 9h 55m
  },
  {
    name: "Saturn",
    radius: 58232,
    color: "#DEB887",
    mass: 5.683e26,
    scale: 1,
    texture: "2k_saturn.jpg",
    dayLength: 10.7  // Saturn's day is 10h 42m
  },
  {
    name: "Uranus",
    radius: 25362,
    color: "#87CEEB",
    mass: 8.681e25,
    scale: 1,
    texture: "2k_uranus.jpg",
    dayLength: 17.2  // Uranus' day is 17h 14m
  },
  {
    name: "Neptune",
    radius: 24622,
    color: "#1E90FF",
    mass: 1.024e26,
    scale: 1,
    texture: "2k_neptune.jpg",
    dayLength: 16.1  // Neptune's day is 16h 6m
  },
  {
    name: "Pluto",
    radius: 1188,
    color: "#808080",
    mass: 1.309e22,
    scale: 1,
    texture: "2k_pluto.jpg",
    dayLength: 153.3  // Pluto's day is 6.4 Earth days (in hours)
  },
];