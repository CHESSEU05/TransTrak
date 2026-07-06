import type { RoleOptions } from "../types/type";

export const onboarding = [
  {
    id: 1,
    key: "discover",
    title: "Discover nearby taxis and bikes",
    description: "See available rides around you in real time.",
    image: require("../assets/images/onboarding-discover-nearby.png"),
  },
  {
    id: 2,
    key: "match",
    title: "Route-aware driver matching",
    description: "We match you with the best driver on your route.",
    image: require("../assets/images/onboarding-route-matching.png"),
  },
  {
    id: 3,
    key: "track",
    title: "Real-time tracking and reporting",
    description:
      "Track your trip live and report incidents for a safer community.",
    image: require("../assets/images/onboarding-realtime-tracking.png"),
  },
];

export const roleOptions: RoleOptions[] = [
  {
    roleId: 1000,
    title: "Passenger",
    description:
      "Search nearby taxis and bikes, choose a route-matched driver, send requests, track accepted trips, and report safety issues when needed.",
    highlights: ["Find nearby transport", "Track accepted drivers", "Submit safety reports"],
    image: require("../assets/images/passenger.png"),
    tint: "bg-primary/10",
    border: "border-primary/25",
    accent: "#007FFF",
  },
  {
    roleId: 2000,
    title: "Driver",
    description:
      "Share availability, publish your route, receive passenger requests, and stay visible to people moving around your area.",
    highlights: ["Share your active route", "Receive ride requests", "Manage verification status"],
    image: require("../assets/images/driver.png"),
    tint: "bg-success/10",
    border: "border-success/25",
    accent: "#2ECC71",
  },
];
