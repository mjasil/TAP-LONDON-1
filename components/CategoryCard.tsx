"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BadgePercent, Bus, Landmark, ShoppingBag, ShieldCheck, Utensils } from "lucide-react";

const iconMap = {
  landmark: Landmark,
  utensils: Utensils,
  shopping: ShoppingBag,
  bus: Bus,
  services: ShieldCheck,
  offers: BadgePercent
};

type CategoryCardProps = {
  href: string;
  label: string;
  description: string;
  icon: keyof typeof iconMap;
};

export default function CategoryCard({ href, label, description, icon }: CategoryCardProps) {
  const Icon = iconMap[icon];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <Link href={href} className="tap-glass-card group flex h-full min-h-44 flex-col justify-between rounded-lg border border-navy/10 bg-white p-5 shadow-sm transition hover:border-gold hover:shadow-lift">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy text-gold">
          <Icon aria-hidden="true" size={22} />
        </span>
        <span>
          <span className="mt-5 block font-heading text-2xl font-bold text-navy">{label}</span>
          <span className="mt-2 line-clamp-2 block text-sm leading-6 text-ink/68">{description}</span>
        </span>
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-navy">
          Open guide <ArrowRight aria-hidden="true" size={16} className="transition group-hover:translate-x-1" />
        </span>
      </Link>
    </motion.div>
  );
}
