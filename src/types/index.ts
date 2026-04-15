import type { LucideIcon } from "lucide-react";

export interface Tool {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  icon: LucideIcon;
  path: string;
  isPopular?: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  path: string;
  toolCount: number;
}

export type Theme = "dark" | "light";
