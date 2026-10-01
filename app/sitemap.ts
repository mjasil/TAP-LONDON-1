import type { MetadataRoute } from "next";
import products from "@/data/nfc-products.json";
import placesData from "@/data/places.json";
import foodData from "@/data/food.json";
import shoppingData from "@/data/shopping.json";
import nightlifeData from "@/data/nightlife.json";
import hotelsData from "@/data/hotels.json";
import kidsData from "@/data/kids.json";
import hiddenGemsData from "@/data/hidden-gems.json";
import theatreData from "@/data/theatre.json";
import universitiesData from "@/data/universities.json";
import daytripsData from "@/data/daytrips.json";
import musicData from "@/data/music.json";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://londontap.co.uk";

function idsFrom(data: any): string[] {
  const items = data?.items || data?.venues || (Array.isArray(data) ? data : []);
  return items.map((i: any) => i.id).filter(Boolean);
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Every top-level category/feature page
  const staticRoutes = [
    "", "/places", "/food", "/shopping", "/nightlife", "/hotels", "/kids",
    "/muslim", "/emergency", "/offers", "/hidden-gems", "/trending", "/sports",
    "/guides", "/events", "/theatre", "/areas", "/universities", "/daytrips",
    "/music", "/trip-builder", "/saved", "/transport", "/services", "/parks", "/budget",
    "/search",
  ];

  // Individual detail pages - this is where most organic search traffic
  // actually lands, and it was completely missing from the sitemap before.
  const detailRoutes = [
    ...idsFrom(placesData).map((id) => `/places/${id}`),
    ...idsFrom(foodData).map((id) => `/food/${id}`),
    ...idsFrom(shoppingData).map((id) => `/shopping/${id}`),
    ...idsFrom(nightlifeData).map((id) => `/nightlife/${id}`),
    ...idsFrom(hotelsData).map((id) => `/hotels/${id}`),
    ...idsFrom(kidsData).map((id) => `/kids/${id}`),
    ...idsFrom(theatreData).map((id) => `/theatre/${id}`),
    ...idsFrom(musicData).map((id) => `/music/${id}`),
  ];

  const nfcRoutes = Object.keys(products).filter((key) => key !== "__comment").map((key) => `/nfc/${key}`);

  const all = [...staticRoutes, ...detailRoutes, ...nfcRoutes];

  return all.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route.startsWith("/nfc") ? "monthly" : route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : staticRoutes.includes(route) ? 0.8 : 0.6,
  })) as MetadataRoute.Sitemap;
}
