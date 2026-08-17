/** Baked in at build time via VITE_ENABLE_3D (see deploy.sh / .env.production). */
export const ENABLE_3D = import.meta.env.VITE_ENABLE_3D === "true";
